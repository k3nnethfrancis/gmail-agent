/**
 * SQLite Database Service for Email Management System
 * 
 * This module provides a complete database abstraction layer for the
 * Inbox Concierge email management system, supporting user-defined tags,
 * AI-powered classification, and user training feedback.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database types
export interface EmailRecord {
  id: string;
  threadId: string;
  messageId: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: string; // ISO string
  isUnread: boolean;
  isImportant: boolean;
  labelIds: string; // JSON array as string
  historyId: string;
  internalDate: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TagRecord {
  id: number;
  name: string;
  color: string;
  description?: string;
  isSystemTag: boolean; // true for default categories
  createdAt: string;
  updatedAt: string;
}

export interface EmailTagRecord {
  id: number;
  emailId: string;
  tagId: number;
  assignedBy: 'user' | 'ai';
  confidence?: number; // For AI assignments
  reasoning?: string; // For AI assignments
  createdAt: string;
}

export interface ClassificationHistoryRecord {
  id: number;
  emailId: string;
  suggestedTagId: number;
  confidence: number;
  reasoning: string;
  userAction: 'accepted' | 'rejected' | 'pending';
  createdAt: string;
  reviewedAt?: string;
}

// Database instance singleton
let dbInstance: Database.Database | null = null;

/**
 * Initialize and return the SQLite database instance
 */
export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Create database directory if it doesn't exist
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'inbox_concierge.db');
  dbInstance = new Database(dbPath);

  // Enable foreign keys and WAL mode for better performance
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');

  // Initialize schema
  initializeSchema(dbInstance);

  return dbInstance;
}

/**
 * Initialize database schema with all required tables
 */
function initializeSchema(db: Database.Database): void {
  // Create emails table
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      from_address TEXT NOT NULL,
      from_name TEXT,
      snippet TEXT NOT NULL,
      body_text TEXT,
      body_html TEXT,
      received_at TEXT NOT NULL,
      is_unread BOOLEAN NOT NULL DEFAULT 1,
      is_important BOOLEAN NOT NULL DEFAULT 0,
      label_ids TEXT NOT NULL DEFAULT '[]',
      history_id TEXT NOT NULL,
      internal_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      description TEXT,
      is_system_tag BOOLEAN NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create email_tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      assigned_by TEXT NOT NULL CHECK (assigned_by IN ('user', 'ai')),
      confidence REAL,
      reasoning TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(email_id, tag_id)
    );
  `);

  // Create classification_history table for AI training
  db.exec(`
    CREATE TABLE IF NOT EXISTS classification_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      suggested_tag_id INTEGER NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT NOT NULL,
      user_action TEXT NOT NULL DEFAULT 'pending' CHECK (user_action IN ('accepted', 'rejected', 'pending')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
      FOREIGN KEY (suggested_tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
    CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
    CREATE INDEX IF NOT EXISTS idx_emails_is_unread ON emails(is_unread);
    CREATE INDEX IF NOT EXISTS idx_email_tags_email_id ON email_tags(email_id);
    CREATE INDEX IF NOT EXISTS idx_email_tags_tag_id ON email_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_classification_history_email_id ON classification_history(email_id);
    CREATE INDEX IF NOT EXISTS idx_classification_history_user_action ON classification_history(user_action);
  `);

  console.warn('🗄️ Database schema initialized - no default tags created');
}

/**
 * Email operations
 */
export class EmailService {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Insert or update an email record
   */
  upsertEmail(email: Omit<EmailRecord, 'createdAt' | 'updatedAt'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO emails (
        id, thread_id, message_id, subject, from_address, from_name,
        snippet, body_text, body_html, received_at, is_unread, is_important,
        label_ids, history_id, internal_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      email.id,
      email.threadId,
      email.messageId,
      email.subject,
      email.fromAddress,
      email.fromName,
      email.snippet,
      email.bodyText,
      email.bodyHtml,
      email.receivedAt,
      email.isUnread ? 1 : 0,
      email.isImportant ? 1 : 0,
      email.labelIds,
      email.historyId,
      email.internalDate
    );
  }

  /**
   * Batch insert emails for efficiency during initial sync
   */
  batchInsertEmails(emails: Omit<EmailRecord, 'createdAt' | 'updatedAt'>[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO emails (
        id, thread_id, message_id, subject, from_address, from_name,
        snippet, body_text, body_html, received_at, is_unread, is_important,
        label_ids, history_id, internal_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const transaction = this.db.transaction((emails: Omit<EmailRecord, 'createdAt' | 'updatedAt'>[]) => {
      for (const email of emails) {
        stmt.run(
          email.id,
          email.threadId,
          email.messageId,
          email.subject,
          email.fromAddress,
          email.fromName,
          email.snippet,
          email.bodyText,
          email.bodyHtml,
          email.receivedAt,
          email.isUnread ? 1 : 0,
          email.isImportant ? 1 : 0,
          email.labelIds,
          email.historyId,
          email.internalDate
        );
      }
    });

    transaction(emails);
  }

  /**
   * Get emails with optional filtering and pagination
   */
  getEmails(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    tagId?: number;
    searchQuery?: string;
  } = {}): EmailRecord[] {
    const { limit = 50, offset = 0, unreadOnly, tagId, searchQuery } = options;

    let query = `
      SELECT DISTINCT e.* FROM emails e
      ${tagId ? 'LEFT JOIN email_tags et ON e.id = et.email_id' : ''}
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (unreadOnly) {
      query += ' AND e.is_unread = 1';
    }

    if (tagId) {
      query += ' AND et.tag_id = ?';
      params.push(tagId);
    }

    if (searchQuery) {
      query += ' AND (e.subject LIKE ? OR e.from_address LIKE ? OR e.snippet LIKE ?)';
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY e.received_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params) as EmailRecord[];
  }

  /**
   * Get email by ID
   */
  getEmailById(id: string): EmailRecord | null {
    const stmt = this.db.prepare('SELECT * FROM emails WHERE id = ?');
    return stmt.get(id) as EmailRecord | null;
  }

  /**
   * Get emails by thread ID
   */
  getEmailsByThreadId(threadId: string): EmailRecord[] {
    const stmt = this.db.prepare('SELECT * FROM emails WHERE thread_id = ? ORDER BY received_at ASC');
    return stmt.all(threadId) as EmailRecord[];
  }

  /**
   * Mark email as read/unread
   */
  updateEmailReadStatus(emailId: string, isUnread: boolean): void {
    const stmt = this.db.prepare('UPDATE emails SET is_unread = ?, updated_at = datetime(\'now\') WHERE id = ?');
    stmt.run(isUnread ? 1 : 0, emailId);
  }

  /**
   * Get email count by status
   */
  getEmailCounts(): { total: number; unread: number; important: number; unassigned: number } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM emails');
    const unreadStmt = this.db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_unread = 1');
    const importantStmt = this.db.prepare('SELECT COUNT(*) as count FROM emails WHERE is_important = 1');
    const unassignedStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM emails e
      LEFT JOIN email_tags et ON e.id = et.email_id
      WHERE et.email_id IS NULL
    `);

    return {
      total: (totalStmt.get() as { count: number }).count,
      unread: (unreadStmt.get() as { count: number }).count,
      important: (importantStmt.get() as { count: number }).count,
      unassigned: (unassignedStmt.get() as { count: number }).count,
    };
  }
}

/**
 * Tag operations
 */
export class TagService {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new tag
   */
  createTag(name: string, color: string, description?: string): TagRecord {
    const stmt = this.db.prepare(`
      INSERT INTO tags (name, color, description, is_system_tag)
      VALUES (?, ?, ?, 0)
    `);

    const result = stmt.run(name, color, description || null);
    return this.getTagById(result.lastInsertRowid as number)!;
  }

  /**
   * Get all tags
   */
  getAllTags(): TagRecord[] {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY is_system_tag DESC, name ASC');
    return stmt.all() as TagRecord[];
  }

  /**
   * Get tag by ID
   */
  getTagById(id: number): TagRecord | null {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE id = ?');
    return stmt.get(id) as TagRecord | null;
  }

  /**
   * Get tag by name
   */
  getTagByName(name: string): TagRecord | null {
    const stmt = this.db.prepare('SELECT * FROM tags WHERE name = ?');
    return stmt.get(name) as TagRecord | null;
  }

  /**
   * Update tag
   */
  updateTag(id: number, updates: Partial<Pick<TagRecord, 'name' | 'color' | 'description'>>): void {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const stmt = this.db.prepare(`
      UPDATE tags SET ${fields}, updated_at = datetime('now') WHERE id = ?
    `);
    stmt.run(...values, id);
  }

  /**
   * Delete tag (all tags can be deleted now)
   */
  deleteTag(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Assign tag to email
   */
  assignTagToEmail(emailId: string, tagId: number, assignedBy: 'user' | 'ai', confidence?: number, reasoning?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO email_tags (email_id, tag_id, assigned_by, confidence, reasoning)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(emailId, tagId, assignedBy, confidence, reasoning);
  }

  /**
   * Remove tag from email
   */
  removeTagFromEmail(emailId: string, tagId: number): void {
    const stmt = this.db.prepare('DELETE FROM email_tags WHERE email_id = ? AND tag_id = ?');
    stmt.run(emailId, tagId);
  }

  /**
   * Get tags for an email
   */
  getEmailTags(emailId: string): Array<TagRecord & { assignedBy: string; confidence?: number; reasoning?: string }> {
    const stmt = this.db.prepare(`
      SELECT t.*, et.assigned_by as assignedBy, et.confidence, et.reasoning
      FROM tags t
      JOIN email_tags et ON t.id = et.tag_id
      WHERE et.email_id = ?
      ORDER BY t.name ASC
    `);
    return stmt.all(emailId) as Array<TagRecord & { assignedBy: string; confidence?: number; reasoning?: string }>;
  }

  /**
   * Get emails by tag
   */
  getEmailsByTag(tagId: number, limit = 50, offset = 0): EmailRecord[] {
    const stmt = this.db.prepare(`
      SELECT e.*
      FROM emails e
      JOIN email_tags et ON e.id = et.email_id
      WHERE et.tag_id = ?
      ORDER BY e.received_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(tagId, limit, offset) as EmailRecord[];
  }

  /**
   * Get tag statistics
   */
  getTagStats(): Array<TagRecord & { emailCount: number; unreadCount: number }> {
    const stmt = this.db.prepare(`
      SELECT 
        t.*,
        COUNT(et.email_id) as emailCount,
        COUNT(CASE WHEN e.is_unread = 1 THEN 1 END) as unreadCount
      FROM tags t
      LEFT JOIN email_tags et ON t.id = et.tag_id
      LEFT JOIN emails e ON et.email_id = e.id
      GROUP BY t.id
      ORDER BY t.is_system_tag DESC, t.name ASC
    `);
    return stmt.all() as Array<TagRecord & { emailCount: number; unreadCount: number }>;
  }
}

/**
 * Classification and AI training operations
 */
export class ClassificationService {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Record AI classification suggestion
   */
  recordClassification(emailId: string, suggestedTagId: number, confidence: number, reasoning: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO classification_history (email_id, suggested_tag_id, confidence, reasoning)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(emailId, suggestedTagId, confidence, reasoning);
    return result.lastInsertRowid as number;
  }

  /**
   * Update user action on classification
   */
  updateClassificationAction(classificationId: number, action: 'accepted' | 'rejected'): void {
    const stmt = this.db.prepare(`
      UPDATE classification_history 
      SET user_action = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(action, classificationId);
  }

  /**
   * Get pending classifications for review
   */
  getPendingClassifications(limit = 20): Array<ClassificationHistoryRecord & { email: EmailRecord; tag: TagRecord }> {
    const stmt = this.db.prepare(`
      SELECT 
        ch.*,
        json_object(
          'id', e.id,
          'subject', e.subject,
          'from_address', e.from_address,
          'snippet', e.snippet,
          'received_at', e.received_at
        ) as email,
        json_object(
          'id', t.id,
          'name', t.name,
          'color', t.color
        ) as tag
      FROM classification_history ch
      JOIN emails e ON ch.email_id = e.id
      JOIN tags t ON ch.suggested_tag_id = t.id
      WHERE ch.user_action = 'pending'
      ORDER BY ch.created_at DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as Array<Record<string, unknown> & { email: string; tag: string }>;
    return results.map(row => ({
      ...row,
      email: JSON.parse(row.email),
      tag: JSON.parse(row.tag),
    }));
  }

  /**
   * Get training examples for AI (user-approved classifications)
   */
  getTrainingExamples(tagId?: number, limit = 100): Array<{
    emailSubject: string;
    emailFrom: string;
    emailSnippet: string;
    tagName: string;
    assignedBy: string;
    userAction?: string;
  }> {
    let query = `
      SELECT 
        e.subject as emailSubject,
        e.from_address as emailFrom,
        e.snippet as emailSnippet,
        t.name as tagName,
        et.assigned_by as assignedBy,
        ch.user_action as userAction
      FROM email_tags et
      JOIN emails e ON et.email_id = e.id
      JOIN tags t ON et.tag_id = t.id
      LEFT JOIN classification_history ch ON e.id = ch.email_id AND t.id = ch.suggested_tag_id
      WHERE (et.assigned_by = 'user' OR ch.user_action = 'accepted')
    `;

    const params: (string | number)[] = [];
    if (tagId) {
      query += ' AND t.id = ?';
      params.push(tagId);
    }

    query += ' ORDER BY e.received_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params) as Array<{
      emailSubject: string;
      emailFrom: string;
      emailSnippet: string;
      tagName: string;
      assignedBy: string;
      userAction?: string;
    }>;
  }

  /**
   * Get classification accuracy metrics
   */
  getClassificationMetrics(): {
    totalSuggestions: number;
    accepted: number;
    rejected: number;
    pending: number;
    accuracy: number;
  } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN user_action = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN user_action = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN user_action = 'pending' THEN 1 END) as pending
      FROM classification_history
    `);

    const result = stmt.get() as { total: number; accepted: number; rejected: number; pending: number };
    const reviewed = result.accepted + result.rejected;
    const accuracy = reviewed > 0 ? result.accepted / reviewed : 0;

    return {
      totalSuggestions: result.total,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending,
      accuracy,
    };
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Export service instances
export const emailService = new EmailService();
export const tagService = new TagService();
export const classificationService = new ClassificationService();