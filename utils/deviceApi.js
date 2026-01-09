// utils/deviceApi.js
const app = getApp();

/**
 * 获取设备信息
 */
function getDeviceInfo(deviceName) {
    return app.apiRequest(`/onenet/device/info/${deviceName}`, 'GET');
}

/**
 * 递归将对象的所有 key 转换为小写
 */
function toLowerKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toLowerKeys);
    return Object.keys(obj).reduce((acc, key) => {
        acc[key.toLowerCase()] = toLowerKeys(obj[key]);
        return acc;
    }, {});
}

/**
 * 获取设备最新属性
 */
async function getDevicePropertyDetail(deviceName, params = null) {
    const data = params ? { params: params } : {};
    const res = await app.apiRequest(`/onenet/device/property-detail/${deviceName}`, 'POST', data);
    return toLowerKeys(res);
}

/**
 * 设置设备期望属性
 */
function setDeviceDesiredProperty(deviceName, deviceProperty) {
    return app.apiRequest(`/onenet/device/set-desired-property/${deviceName}`, 'POST', deviceProperty);
}

//用户解绑
function unbindDevice(deviceName){
  return app.apiRequest('/pro/banding/unbind','GET',deviceName);
}

//获取用户绑定设备信息
function getUserActiveDevice(){
  return app.apiRequest('/pro/banding/my','GET');
}

module.exports = {
    getDeviceInfo,
    getDevicePropertyDetail,
    setDeviceDesiredProperty,
    getUserActiveDevice,
    unbindDevice
};
