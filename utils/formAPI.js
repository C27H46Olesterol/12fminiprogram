const app = getApp();
const FormData = require('./formdata.js');

//上传图片文件
async function uploadImg(data) {
  const res = await app.apiRequest("/resource/oss/upload", "POST", data.buffer, data.contentType);
  return res.data;
}

// Helper to convert object to FormData payload
function sendMultipartRequest(url, data) {
  let formData = new FormData();
  for (let key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  }
  let res = formData.getData();
  return app.apiRequest(url, 'POST', res.buffer, res.contentType);
}

//上传安装信息
function uploadInstallForm(formData) {
  return sendMultipartRequest('/pro/installRecord', formData);
}

//获取安装列表
function getInstallList() {
  return app.apiRequest();
}

//上传维修信息
function uploadMaintenanceForm(formData) {
  return sendMultipartRequest('/pro/maintenanceRecord', formData);
}

//获取维修列表
function getRepairList() {
  return app.apiRequest();
}

//用户激活设备
function userBindDevice() {

}

// 提交故障报修 (Client)
function uploadIssueForm(formData) {
  return sendMultipartRequest('/pro/repair', formData);
}

//用户激活设备列表
function userGetDeviceList() {

}

module.exports = {
  uploadInstallForm,
  uploadMaintenanceForm,
  uploadIssueForm,
  uploadImg
};