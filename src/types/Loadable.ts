export type Loadable<T> = T | Promise<T> | (() => T) | (() => Promise<T>);
