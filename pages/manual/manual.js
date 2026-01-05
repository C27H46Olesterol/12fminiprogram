// pages/manual/manual.js
Page({
  data: {
    activeTab: 'fault', // 'fault' or 'basic'
    searchQuery: '',
    faultCodes: [
      {
        code: 'E1/LU',
        title: '电池电压过低',
        cause: '显示屏检测到电压过低',
        checks: ['显示屏电压显示'],
        solutions: [
          '设置低电压保护',
          '开机后查看电池电压是否正确',
          '检查电池线规格是否足够（线径不足会导致压降过大）'
        ],
        videoUrl: 'https://cdn.example.com/videos/E1_E12_low_voltage.mp4',
        expanded: false
      },
      {
        code: 'E2',
        title: '压缩机发热/电流保护',
        cause: '1. 压缩机发热，散热不良；2. 过流保护',
        checks: ['压缩机和风机'],
        analysis: '分为三种情况：1. 压缩机和风机都不工作；2. 压缩机工作，风机不工作；3. 压缩机不工作，风机工作。',
        solutions: [
          '检查风机线路是否有电压。有电压表明风机损坏，无电压则更换控制器',
          '检查压缩机线路插头螺帽是否松动烧焦，正常需更换控制器或轴机',
          '主机断电30秒后重新启动。刚启动报E2说明控制器原件过流保护，过几分钟报E2说明电子元器件过热保护'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'E3',
        title: '堵转保护',
        cause: '压缩机堵转',
        checks: ['压缩机及空调系统'],
        analysis: '1. 压机启动有抖动现象但不成功；2. 运行1分钟或几分钟报E3。',
        solutions: [
          '查询风机是否正常转动。不断断电启动切换检查是否需更换控制器',
          '更换控制器后仍报E3，说明压缩机卡缸，需更换压缩机',
          '系统内部杂质导致堵转，需更换干燥瓶补冷媒，并清洗系统',
          '检查管路是否堵塞。正常压力：高压1.0-1.5MPa，高于2.0MPa容易堵转。低压0MPa左右检查过滤器网'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'E4',
        title: '控制器低压保护',
        cause: '控制器测得母线电压不足',
        checks: ['电源线接头', '电源线插头'],
        analysis: '供电电压不足20.5V(12V设备对应10.5V)。可能是电瓶电压低或电源线压降过大。',
        solutions: [
          '使用万用表测量设备正负极在开机后的电压是否在正常范围',
          '若电压下降过快，说明电瓶电量低或老旧',
          '若电压正常却报E4，检查线路接头是否有松动，或线路是否过细。若排除线路问题则更换控制器'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'E5',
        title: '控制器故障',
        cause: '控制器芯片或元器件损坏',
        checks: ['控制器'],
        solutions: [
          '直接更换控制器',
          'D800的E5参考AC故障'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'E6/E8/E9/E10',
        title: '风机故障/过流',
        cause: '1. 风机过流保护；2. 电子故障',
        checks: ['室外风机'],
        analysis: '风机被异物卡住、风机电机损坏、控制器故障。',
        solutions: [
          '检查风机叶片是否有异物卡死',
          '断开风机插头开机测试，若不报故障则是风机异常；若仍报故障则是控制器损坏',
          '主机断电30秒后重启。若立即报故障说明电子件故障，需更换控制器'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'E7',
        title: '压缩机缺相',
        cause: '压缩机三相不平衡',
        checks: ['控制器', '压缩机', '连接线'],
        analysis: '压缩机三相中有一相断路或接触不良。',
        solutions: [
          '检查压缩机插头插座是否松动或烧焦',
          '测量压缩机三相接柱间的电阻是否一致。若电阻不一致说明压机线圈故障，需更换压缩机',
          '若线路和压机都正常，则更换控制器'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'AC',
        title: '制冷系统故障',
        cause: '制冷效果差或完全不制冷',
        checks: ['冷媒量', '漏点'],
        solutions: [
          '检查系统是否有冷媒泄漏',
          '检查冷凝器是否过脏影响散热',
          '检查干燥瓶是否堵塞'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: 'OPE/SHr',
        title: '温度传感器故障',
        cause: 'OPE为开路，SHr为短路',
        checks: ['环温/管温传感器'],
        solutions: [
          '检查传感器插头是否脱落',
          '更换对应的温度传感器'
        ],
        videoUrl: '',
        expanded: false
      },
      {
        code: '外机不工作',
        title: '室外机未运行',
        cause: '模式错误、温度设定、或硬件故障',
        checks: ['控制器指示灯', '设定温度'],
        solutions: [
          '检查是否开启了AC（制冷）模式',
          '检查设定温度是否低于室内环境温度',
          '查看控制器指示灯：绿灯闪烁正常，红灯闪烁则有对应故障码'
        ],
        videoUrl: '',
        expanded: false
      }
    ],
    filteredFaultCodes: []
  },

  onLoad() {
    this.setData({
      filteredFaultCodes: this.data.faultCodes
    });
  },

  onSearch(e) {
    const query = e.detail.value.toLowerCase();
    const filtered = this.data.faultCodes.filter(item =>
      item.code.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.cause.toLowerCase().includes(query)
    );
    this.setData({
      searchQuery: query,
      filteredFaultCodes: filtered
    });
  },

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    const key = `filteredFaultCodes[${index}].expanded`;
    this.setData({
      [key]: !this.data.filteredFaultCodes[index].expanded
    });
  },

  switchTab(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab
    });
  },

  goReport() {
    wx.makePhoneCall({
      phoneNumber: '400-888-6988',
      fail: (err) => {
        console.error('拨打电话失败：', err);
      }
    });
  }
});