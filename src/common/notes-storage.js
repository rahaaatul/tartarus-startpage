// Notes storage utility for client-server communication

class NotesStorage {
  constructor() {
    // Use machine IP address for network access - ensure Node.js server is running on port 3001
    this.baseUrl = 'http://192.168.1.11:3001/api';
  }

  /**
   * Load notes from the server
   * @returns {Promise<Object>} Notes object with content and timestamp
   */
  async loadNotes() {
    try {
      const response = await fetch(`${this.baseUrl}/notes`);
      const data = await response.json();

      if (data.success) {
        return data.notes;
      } else {
        throw new Error(data.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      // Return default empty notes on error
      return { content: '', timestamp: new Date().toISOString() };
    }
  }

  /**
   * Save notes to the server
   * @param {string} content - The notes content to save
   * @returns {Promise<boolean>} Success status
   */
  async saveNotes(content) {
    try {
      const notes = {
        content: content,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notes)
      });

      const data = await response.json();

      if (data.success) {
        return true;
      } else {
        throw new Error(data.error || 'Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      return false;
    }
  }
}

// Create a singleton instance
const notesStorage = new NotesStorage();
