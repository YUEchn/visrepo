/**
 * 封装axios http请求
 */
import axios from "axios";
// 开发本地代理
axios.defaults.baseURL = "/api";
// 设置头部
axios.defaults.headers.post["Content-Type"] = "application/json; charset=UTF-8";
// 设置响应超时时间
axios.defaults.timeout = 500000;
// 设置接口拦截器
axios.interceptors.request.use((config) => {
  // @ts-ignore
  config.headers = { DeviceType: "H5" };
  return config;
});

/**
 * 使用promise封装get/post请求
 */

export function get(url) {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((res) => {
        resolve({ ok: true, data: res.data });
      })
      .catch((err) => {
        resolve({ ok: false, msg: err });
        // reject(err.response.data);
      });
  });
}

export function post(url, data={}) {
  return new Promise((resolve, reject) => {
    axios
      .post(url, data)
      .then((res) => {
        resolve({ ok: true, data: res.data });
      })
      .catch((err) => {
        resolve({ ok: false, msg: err });
        // reject(err.response.data);
      });
  });
}

// 基于async进行封装
export const get_async = async (url, params = {}) => {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (err) {
    console.log("GET请求错误", err.message);
    throw new Error(err);
  }
};

export const post_async = async (url, data = {}) => {
  try {
    const response = await axios.get(url, { data });
    return response.data;
  } catch (err) {
    console.log("POST请求错误", err.message);
    throw new Error(err);
  }
};
