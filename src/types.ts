export type Visualization = {
  title?: string;
  description?: string;
  mount(container: HTMLElement): Promise<void>;
};