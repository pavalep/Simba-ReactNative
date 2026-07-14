class SessionService {
  private recentFiles: string[] = [];

  async getRecentFiles(): Promise<string[]> {
    return this.recentFiles;
  }

  async addRecentFile(filePath: string): Promise<void> {
    this.recentFiles = [
      filePath,
      ...this.recentFiles.filter(f => f !== filePath),
    ].slice(0, 20);
  }

  async clearRecentFiles(): Promise<void> {
    this.recentFiles = [];
  }
}

export const sessionService = new SessionService();
