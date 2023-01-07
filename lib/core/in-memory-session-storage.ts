import { Session } from '@shopify/shopify-api';
import { SessionStorage } from '../interfaces';
import { Logger } from '@nestjs/common';

/**
 * This package implements the SessionStorage interface to work with an in-memory storage table.
 */
export class InMemorySessionStorage implements SessionStorage {
  private readonly logger = new Logger('InMemorySessionStorage');
  private readonly sessions: { [id: string]: Session } = {};

  constructor() {
    this.logger.warn(`
    This session storage model is for local development only, to make it easier for developers to get started.
    It will delete all sessions if the app process gets restarted or redeployed, and is NOT meant for production use.
    For persistent storage, use your own implementation of the session storage.
    `);
  }

  public async storeSession(session: Session): Promise<boolean> {
    this.sessions[session.id] = session;
    return true;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    return this.sessions[id] || undefined;
  }

  public async deleteSession(id: string): Promise<boolean> {
    if (this.sessions[id]) {
      delete this.sessions[id];
    }
    return true;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    ids.forEach((id) => delete this.sessions[id]);
    return true;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    const results = Object.values(this.sessions).filter(
      (session) => session.shop === shop,
    );
    return results;
  }
}
