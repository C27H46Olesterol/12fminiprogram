// 云函数入口文件
const cloud = require('wx-server-sdk')
const core = require('@huaweicloud/huaweicloud-sdk-core')
const iotda = require('@huaweicloud/huaweicloud-sdk-iotda/v5/public-api');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const ak = 'HPUAX7WMA10V6NA4HH9E';
const sk = 'h5lDcKYLP8DdD5eHP6BvziZk37ze6lTPMnt4qHCr';
const projectId = '99274887d94f4afe9ee407da506456ec';
const endpoint = "https://08d987494f.st1.iotda-app.cn-north-4.myhuaweicloud.com";
const regionId = 'cn-north-4'

const credentials = new core.BasicCredentials()
      .withAk(ak)
      .withSk(sk)
      .withDerivedPredicate(core.BasicCredentials.getDefaultDerivedPredicate)
      .withProjectId(projectId);

const  client = iotda.IoTDAClient.newBuilder()
      .withCredential(credentials)
      .withEndpoint(endpoint)
      .withRegion(new core.Region(regionId,endpoint))
      .build();

//
async function getDeviceList() {
    // 测试请求
    try{
      // const request = new iotda.ListDevicesRequest();
      const deviceId = '868020040792326';
      const productId = '69338c72bf22cc5a8c0daa16';

      const request = new iotda.ListDevicesRequest()
      request.limit = 10; // 限制返回数量
      // request.deviceId = deviceId;
      // request.productId = productId
      console.log(JSON.stringify(request))
      const result = await client.listDevices(request);
      // console.log("JSON.stringify(result)::" + JSON.stringify(result));
      return JSON.stringify(result)
    }catch(error){
      return error
    }
}

/**给设备下发信息
 * param: 
 * message
 * deviceId
 * **/
async function sendMessagetoDevice(event){
  // const {message} = event.message;
  //test 使用定义
  const message = 'huaweicloud_message:test123456';
  try{
    const deviceId = '869810062101201';
    const productId = '69338c72bf22cc5a8c0daa16'; 

    const request = new iotda.CreateMessageRequest()
    const body = new iotda.DeviceMessageRequest()
    body.message = "huaweicloud_message"
    request.limit = 10; // 限制返回数量
    request.deviceId = deviceId;
    // request.productId = productId
    request.withBody(body)
    console.log(JSON.stringify(request))
    const result = await client.createMessage(request);
    // console.log("JSON.stringify(result)::" + JSON.stringify(result));
    return JSON.stringify(result)
  }catch(error){
    return error;
  }
}


// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  // try{
    
  // }catch(error){
  //   return {
  //     success:false,
  //     msessage:'创建华为云访问链接失败！'
  //   }
  // }

  switch (event.action) {
    //获取设备列表
    case 'getDeviceList':
      return await getDeviceList(event);
    //发送设备信息
    case 'sendMessagetoDevice':
      return await sendMessagetoDevice(event);
    default:
      return {
        errMsg:'未知的操作'
      };;
  }

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
} 