const app = getApp();

//上传图片文件
async function uploadImg(path){
  return app.apiRequest("/resource/oss/upload","POST",path,'multipart/form-data')
}

//上传安装信息
function uploadInstallForm(formData){
  return app.apiRequest('/pro/installRecord','POST',formData);
}

//获取安装列表
function getInstallList(){
  return app.apiRequest();
}

//上传维修信息
function uploadReapirForm(formData){
  return app.apiRequest('','POST',formData)
}

//获取维修列表
function getRepairList(){
  return app.apiRequest();
}

//用户激活设备
function userBindDevice(){

}

//用户激活设备列表
function userGetDeviceList(){

}

module.exports = {
  uploadInstallForm,
  uploadImg
};