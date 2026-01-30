/**
 * 资源加载器模块
 *
 * 封装资源加载逻辑，支持本地和远程资源切换
 *
 * @module services/resourceLoader
 */

/**
 * 资源加载配置
 */
interface ResourceLoaderConfig {
  /** 是否使用远程资源 */
  useRemote: boolean;
  /** 远程资源基础URL */
  remoteBaseUrl: string;
  /** 本地资源基础路径 */
  localBasePath: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ResourceLoaderConfig = {
  useRemote: import.meta.env.VITE_USE_REMOTE_ASSETS === 'true',
  remoteBaseUrl: 'https://pokemon-model-1400264169.cos.ap-beijing.myqcloud.com',
  localBasePath: '', // 本地模式下不添加额外路径前缀，因为http-server已经serve assets作为根目录
};

/**
 * 当前配置
 */
let currentConfig: ResourceLoaderConfig = { ...DEFAULT_CONFIG };

/**
 * 设置资源加载配置
 *
 * @param config - 新的配置
 */
export function setResourceLoaderConfig(config: Partial<ResourceLoaderConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取资源加载配置
 *
 * @returns 当前配置
 */
export function getResourceLoaderConfig(): ResourceLoaderConfig {
  return { ...currentConfig };
}

/**
 * 转换资源路径
 *
 * @param path - 原始路径
 * @returns 转换后的路径
 */
export function resolveResourcePath(path: string): string {
  // 移除开头的斜杠
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // JSON文件始终从本地加载
  if (cleanPath.endsWith('.json')) {
    return `${currentConfig.localBasePath}/${cleanPath}`;
  }

  if (currentConfig.useRemote) {
    // 在开发环境下使用代理路径避免CORS问题
    if (import.meta.env.DEV) {
      return `/remote-assets/${cleanPath}`;
    } else {
      // 生产环境下直接使用COS URL
      return `${currentConfig.remoteBaseUrl}/${cleanPath}`;
    }
  } else {
    // 本地路径
    return `${currentConfig.localBasePath}/${cleanPath}`;
  }
}

/**
 * 加载文本资源
 *
 * @param path - 资源路径
 * @returns Promise<string> 文本内容
 */
export async function loadTextResource(path: string): Promise<string> {
  const resolvedPath = resolveResourcePath(path);

  const response = await fetch(resolvedPath);
  if (!response.ok) {
    throw new Error(`Failed to load text resource: ${resolvedPath} (HTTP ${response.status})`);
  }

  return response.text();
}

/**
 * 加载二进制资源
 *
 * @param path - 资源路径
 * @returns Promise<ArrayBuffer> 二进制数据
 */
export async function loadBinaryResource(path: string): Promise<ArrayBuffer> {
  const resolvedPath = resolveResourcePath(path);

  const response = await fetch(resolvedPath);
  if (!response.ok) {
    throw new Error(`Failed to load binary resource: ${resolvedPath} (HTTP ${response.status})`);
  }

  return response.arrayBuffer();
}

/**
 * 加载JSON资源
 *
 * @param path - 资源路径
 * @returns Promise<any> 解析后的JSON对象
 */
export async function loadJsonResource(path: string): Promise<any> {
  const text = await loadTextResource(path);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON resource: ${path} - ${error}`);
  }
}

/**
 * 检查资源是否存在
 *
 * @param path - 资源路径
 * @returns Promise<boolean> 是否存在
 */
export async function checkResourceExists(path: string): Promise<boolean> {
  const resolvedPath = resolveResourcePath(path);

  try {
    const response = await fetch(resolvedPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}