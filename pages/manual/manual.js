// pages/manual/manual.js
Page({
  data: {
    searchQuery: '',
    faultList: [
      {
        code: 'E1/LU',
        title: '检测电压过低',
        cause: '显示屏检测电压过低',
        check: '电源系统',
        analysis: '电池电量不足或线路压降大',
        solution: [
          '设置低电压保护',
          '开机后查看显示电压是否正确',
          '检查电源线感应线路接触是否良好'
        ],
        expanded: false
      },
      {
        code: 'E2',
        title: '压缩机过流保护',
        cause: '1.压缩机发热、散热不良; 2.过流保护。',
        check: '压缩机和风扇',
        analysis: '分为压缩机/风扇不工作、压缩机风扇同步不工作等三种情况',
        solution: [
          '检查电机绕组间电压 (标准 9-19V)',
          '检查风机线路是否有接触不良',
          '检查压缩机主线插头是否松动脱落',
          '系统断电30秒后重启'
        ],
        expanded: false
      },
      {
        code: 'E3',
        title: '堵转保护',
        cause: '由于机械故障引起的转动受阻',
        check: '压缩机及空调系统',
        analysis: '1.压缩机启动瞬间动感，但不转动；2.压缩机工作1分钟或几分钟报E3',
        solution: [
          '查看控制器是否正常启动',
          '更换控制器测试（若仍有问题则为压缩机卡缸）',
          '检查制冷系统是否脏堵或高压过载',
          '检查空调高低压力是否在正常范围'
        ],
        expanded: false
      },
      {
        code: 'E4',
        title: '控制器低压保护',
        cause: '控制器电源电压低于保护值',
        check: '电源接线、电源插头',
        analysis: '1.供电不足或设定电压过高；2.电压波动导致',
        solution: [
          '用万用表测试电源正负端电压',
          '检查电源线是否过长，电阻过大',
          '检查插头是否有虚接或氧化导致压降'
        ],
        expanded: false
      },
      {
        code: 'E5',
        title: '控制器故障',
        cause: '控制器逻辑硬件损坏',
        check: '控制器',
        analysis: '控制板内部电路异常',
        solution: ['更换控制器'],
        expanded: false
      },
      {
        code: 'E6/E8/E9/E10',
        title: '风机故障',
        cause: '1.风机过载保护; 2.电子故障。',
        check: '检查外外风机',
        analysis: '外风机扇叶卡住、电机烧毁或控制器保护',
        solution: [
          '查看风扇是否有异物卡住',
          '断开风机供电插头，查看开机后是否报错',
          '更换电子扇测试',
          '主控换板测试'
        ],
        expanded: false
      },
      {
        code: 'E7',
        title: '压缩机缺相',
        cause: '压缩机三相绕阻或连接异常',
        check: '控制器 / 压缩机 / 连接线',
        analysis: '压缩机三相线有一根或多根断路或短路',
        solution: [
          '检查压缩机插头、控制板插脚',
          '用万用表测量压缩机三相阻值是否平衡',
          '检查主线是否由于磨损导致断路'
        ],
        expanded: false
      },
      {
        code: 'OPE',
        title: '温度传感器断开',
        cause: '感温头信号丢失',
        check: '温温传感器、插件',
        analysis: '线路断开或插头松动',
        solution: ['检查传感器感温头插头是否松脱', '更换感温线'],
        expanded: false
      },
      {
        code: 'SHr',
        title: '温度传感器短路',
        cause: '电阻值异常过小',
        check: '温温传感器',
        analysis: '感温头内部短路',
        solution: ['直接更换传感器'],
        expanded: false
      },
      {
        code: '效果不好',
        title: '制冷/制热效果差',
        cause: '1. 设定温度不当; 2. 系统压力异常; 3. 冷凝器散热差',
        check: '制冷剂压力、冷凝器、风机',
        analysis: '压力过低(0.2-0.4mpa)或过高(10-15mpa)；冷凝器脏堵',
        solution: [
          '清洗冷凝器，确保散热风路通畅',
          '通过压力表检测制冷剂是否亏损或过量',
          '检查外风机风量是否正常',
          '根据室内温差重新设定目标温度'
        ],
        expanded: false
      },
      {
        code: '其他',
        title: '指示灯异常',
        cause: '控制系统检测到非代码类故障',
        check: '显示屏、控制面板',
        analysis: 'AC灯不亮、模式指示错误',
        solution: [
          '检查显示屏背部排线是否松动',
          '在强制启动模式下观察外机反应',
          '检查感温头保险丝是否熔断'
        ],
        expanded: false
      }
    ],
    displayList: []
  },

  onLoad() {
    this.setData({
      displayList: this.data.faultList
    });
  },

  onSearch(e) {
    const query = e.detail.value.toLowerCase();
    const filtered = this.data.faultList.filter(item =>
      item.code.toLowerCase().includes(query) ||
      item.title.includes(query) ||
      item.cause.includes(query)
    );
    this.setData({
      searchQuery: query,
      displayList: filtered
    });
  },

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.displayList;
    list[index].expanded = !list[index].expanded;
    this.setData({
      displayList: list
    });
  }
});