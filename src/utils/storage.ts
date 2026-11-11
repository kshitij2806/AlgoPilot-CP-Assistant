export class StorageManager {
  private storageArea: chrome.storage.StorageArea;
  
  constructor(area: 'sync' | 'local' = 'sync') {
    this.storageArea = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  }
  
  async get(key: string): Promise<any> {
    return new Promise((resolve) => {
      this.storageArea.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }
  
  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      const data: Record<string, any> = {};
      data[key] = value;
      this.storageArea.set(data, () => {
        resolve();
      });
    });
  }
  
  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      this.storageArea.remove(key, () => {
        resolve();
      });
    });
  }
  
  async getAll(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      this.storageArea.get(null, (result) => {
        resolve(result);
      });
    });
  }
  
  async clear(): Promise<void> {
    return new Promise((resolve) => {
      this.storageArea.clear(() => {
        resolve();
      });
    });
  }
}