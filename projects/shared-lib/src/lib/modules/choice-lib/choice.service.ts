import {Injectable} from '@angular/core';

declare const Choices: any;

@Injectable({
  providedIn: 'root'
})
export class ChoiceService {
  private instances = new Map<string, any>();

  createInstance(element: HTMLElement, config: any = {}): any {
    const defaultConfig = {
      itemSelectText: '',
      ...config
    };
    return new Choices(element, defaultConfig);
  }

  registerInstance(id: string, instance: any): void {
    this.instances.set(id, instance);
  }

  getInstance(id: string): any | undefined {
    return this.instances.get(id);
  }

  destroyInstance(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.destroy();
      this.instances.delete(id);
    }
  }

  destroyAll(): void {
    this.instances.forEach(instance => instance.destroy());
    this.instances.clear();
  }
}
