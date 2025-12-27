// utils/deviceApi.js
const app = getApp();

/**
 * 获取设备信息
 */
function getDeviceInfo(deviceName) {
    return app.apiRequest(`/onenet/device/info/${deviceName}`, 'GET');
}

/**
 * 获取设备最新属性
 */
function getDevicePropertyDetail(deviceName, params = null) {
    const data = params ? { params: params } : {};
    return app.apiRequest(`/onenet/device/property-detail/${deviceName}`, 'POST', data);
}

/**
 * 设置设备期望属性
 */
function setDeviceDesiredProperty(deviceName, deviceProperty) {
    return app.apiRequest(`/onenet/device/set-desired-property/${deviceName}`, 'POST', deviceProperty);
}

module.exports = {
    getDeviceInfo,
    getDevicePropertyDetail,
    setDeviceDesiredProperty
};
