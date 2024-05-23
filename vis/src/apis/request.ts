import { get_async, post_async } from "./http";

export async function fetchData(url, params = {}) {
  try {
    let response = await get_async(url, params);
    return response;
  } catch (err) {
    console.log("发生错误");
  }
}

export async function senData(url, data = {}) {
  try {
    const response = await post_async(url, data);
    return response;
  } catch (err) {
    console.log(err);
  }
}
