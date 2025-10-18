// Firestore REST API wrapper
const projectId = process.env.FIREBASE_PROJECT_ID;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

class FirestoreDB {
  constructor() {
    this.projectId = projectId;
    this.baseUrl = baseUrl;
  }

  collection(collectionName) {
    return new Collection(collectionName, this.baseUrl);
  }
}

class Collection {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
  }

  doc(docId) {
    return new Document(this.name, docId, this.baseUrl);
  }
}

class Document {
  constructor(collectionName, docId, baseUrl) {
    this.collectionName = collectionName;
    this.docId = docId;
    this.baseUrl = baseUrl;
    this.path = `${baseUrl}/${collectionName}/${docId}`;
  }

  async get() {
    try {
      const response = await fetch(this.path);

      if (response.status === 404) {
        return { exists: false };
      }

      if (!response.ok) {
        throw new Error(`Failed to get document: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        exists: true,
        data: () => this.parseFirestoreData(data.fields)
      };
    } catch (error) {
      console.error('Firestore get error:', error);
      return { exists: false };
    }
  }

  async set(data) {
    try {
      const firestoreData = {
        fields: this.toFirestoreFormat(data)
      };

      const response = await fetch(this.path, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreData)
      });

      if (!response.ok) {
        throw new Error(`Failed to set document: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Firestore set error:', error);
      throw error;
    }
  }

  toFirestoreFormat(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result[key] = {
          arrayValue: {
            values: value.map(item => {
              if (typeof item === 'object' && item !== null) {
                return { mapValue: { fields: this.toFirestoreFormat(item) } };
              }
              return this.toFirestoreValue(item);
            })
          }
        };
      } else if (value instanceof Date) {
        result[key] = { timestampValue: value.toISOString() };
      } else if (typeof value === 'object' && value !== null) {
        result[key] = { mapValue: { fields: this.toFirestoreFormat(value) } };
      } else {
        result[key] = this.toFirestoreValue(value);
      }
    }
    return result;
  }

  toFirestoreValue(value) {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return { integerValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value === null) return { nullValue: null };
    return { stringValue: String(value) };
  }

  parseFirestoreData(fields) {
    if (!fields) return null;

    const result = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value.stringValue !== undefined) {
        result[key] = value.stringValue;
      } else if (value.integerValue !== undefined) {
        result[key] = parseInt(value.integerValue);
      } else if (value.booleanValue !== undefined) {
        result[key] = value.booleanValue;
      } else if (value.arrayValue) {
        result[key] = value.arrayValue.values?.map(v => {
          if (v.mapValue) {
            return this.parseFirestoreData(v.mapValue.fields);
          }
          return this.parseFirestoreValue(v);
        }) || [];
      } else if (value.mapValue) {
        result[key] = this.parseFirestoreData(value.mapValue.fields);
      } else if (value.timestampValue) {
        result[key] = new Date(value.timestampValue);
      }
    }
    return result;
  }

  parseFirestoreValue(value) {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.nullValue !== undefined) return null;
    return null;
  }
}

const db = new FirestoreDB();

export { db };
