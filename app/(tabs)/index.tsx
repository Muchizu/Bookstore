import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('bookstore.db');

type Book = {
  id: number;
  name: string;
  description: string;
  price: number;
};

type Sale = {
  id: number;
  book_id: number;
  price: number;
  sold_at: string;
  name: string; // This will be the book name at time of sale
};

export default function Bookstore() {
  const [books, setBooks] = useState<Book[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [profit, setProfit] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price INTEGER
      );
    `);
    db.execSync(`DROP TABLE IF EXISTS sales;`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        price INTEGER,
        sold_at TEXT,
        book_name TEXT
      );
    `);
    loadBooks();
    loadProfit();
    loadSales();
  }, []);

  const loadBooks = () => {
    const result = db.getAllSync('SELECT * FROM books ORDER BY name ASC;');
    const data: Book[] = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
    }));
    setBooks(data);
  };

  const loadProfit = () => {
    const result = db.getFirstSync('SELECT SUM(price) as total FROM sales;') as { total: number | null } | undefined;
    setProfit(result?.total ?? 0);
  };

  const loadSales = () => {
    const result = db.getAllSync(`
      SELECT id, book_id, price, sold_at, book_name as name
      FROM sales
      ORDER BY sold_at DESC
      LIMIT 20;
    `);
    setSales(result as Sale[]);
  };

  const addBook = () => {
    const parsedPrice = parseInt(price);
    if (!name.trim() || !description.trim() || isNaN(parsedPrice)) return;

    db.execSync(`
      INSERT INTO books (name, description, price)
      VALUES ('${name.trim().replace(/'/g, "''")}', '${description.trim().replace(/'/g, "''")}', ${parsedPrice});
    `);
    setName('');
    setDescription('');
    setPrice('');
    loadBooks();
  };

  const deleteBook = (id: number) => {
    db.execSync(`DELETE FROM books WHERE id = ${id};`);
    loadBooks();
  };

  const sellBook = (book: Book) => {
    const now = new Date().toISOString();
    db.execSync(`
      INSERT INTO sales (book_id, price, sold_at, book_name)
      VALUES (${book.id}, ${book.price}, '${now}', '${book.name.replace(/'/g, "''")}')
    `);
    db.execSync(`DELETE FROM books WHERE id = ${book.id};`);
    loadBooks();
    loadProfit();
    loadSales();
  };

  const startEditing = (book: Book) => {
    setEditingId(book.id);
    setEditName(book.name);
    setEditDescription(book.description);
    setEditPrice(book.price.toString());
  };

  const saveEdit = (id: number) => {
    const parsedPrice = parseInt(editPrice);
    if (!editName.trim() || !editDescription.trim() || isNaN(parsedPrice)) return;

    db.execSync(`
      UPDATE books
      SET name = '${editName.trim().replace(/'/g, "''")}',
          description = '${editDescription.trim().replace(/'/g, "''")}',
          price = ${parsedPrice}
      WHERE id = ${id};
    `);
    cancelEdit();
    loadBooks();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditPrice('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.container}>
            <Text style={styles.title}>📚 Bookstore</Text>
            <Text style={styles.total}>Total Profit: ₱{profit}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Book Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Price"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
              <TouchableOpacity style={styles.addButton} onPress={addBook}>
                <Text style={styles.addButtonText}>Add Book</Text>
              </TouchableOpacity>
            </View>

            {/* Book List */}
            {books.map(book => (
              <View key={book.id} style={styles.itemBox}>
                {editingId === book.id ? (
                  <>
                    <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} />
                    <TextInput style={styles.editInput} value={editDescription} onChangeText={setEditDescription} />
                    <TextInput style={styles.editInput} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.saveButton} onPress={() => saveEdit(book.id)}>
                        <Text style={styles.buttonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.itemText}>{book.name} - ₱{book.price}</Text>
                    <Text style={{ fontSize: 14, color: '#444', marginBottom: 8 }}>{book.description}</Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity style={styles.editButton} onPress={() => startEditing(book)}>
                        <Text style={styles.buttonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteBook(book.id)}>
                        <Text style={styles.buttonText}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.sellButton} onPress={() => sellBook(book)}>
                        <Text style={styles.buttonText}>Sell</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}

            {/* Sales History Section */}
            <Text style={[styles.title, { marginTop: 20 }]}>🧾 Sales History</Text>
            {sales.length === 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>No sales yet.</Text>
            )}
            {sales.map(sale => (
              <View key={sale.id} style={styles.saleItem}>
                <Text style={styles.saleText}>
                  {sale.name} - ₱{sale.price}
                </Text>
                <Text style={styles.saleDate}>
                  {new Date(sale.sold_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9F9FF',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4B2991',
  },
  total: {
    fontSize: 20,
    marginBottom: 15,
    color: '#6C63FF',
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    width: '90%',
    padding: 10,
    backgroundColor: '#fff',
    borderColor: '#999',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 6,
    marginHorizontal: 10,
    borderLeftWidth: 6,
    borderLeftColor: '#6C63FF',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  editButton: {
    backgroundColor: '#2196F3',
    padding: 6,
    borderRadius: 6,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 6,
    borderRadius: 6,
    marginRight: 5,
  },
  sellButton: {
    backgroundColor: '#FF9800',
    padding: 6,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 6,
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: '#999',
    padding: 6,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saleItem: {
    backgroundColor: '#f3f3fa',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 10,
  },
  saleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  saleDate: {
    fontSize: 13,
    color: '#888',
  },
});