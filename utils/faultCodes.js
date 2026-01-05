// 故障代码数据映射 - 同步自 manual 页面
const FAULT_CODES = {
    1: {
        code: 'E1',
        title: '电池电压过低',
        cause: '系统检测到电池电压低于设定阈值',
        checks: ['显示屏电压显示'],
        solutions: [
            '检查电瓶电压是否正常',
            '检查电源线接触是否良好',
            '检查电线规格是否满足要求'
        ],
        videoUrl: 'https://cdn.example.com/videos/E1_E12_low_voltage.mp4'
    },
    2: {
        code: 'E2',
        title: '压缩机电流/发热保护',
        cause: '压缩机运行电流过大或由于散热不良导致过热',
        checks: ['压缩机和风机'],
        analysis: '1. 风机不转；2. 系统压力异常。',
        solutions: [
            '检查风机是否被异物卡住',
            '检查冷凝器是否过脏',
            '断电30秒后重新启动'
        ],
        videoUrl: ''
    },
    3: {
        code: 'E3',
        title: '压缩机堵转/系统保护',
        cause: '压缩机机械卡死或启动瞬间电流异常',
        checks: ['压缩机及空调系统'],
        solutions: [
            '检查冷凝器风机是否运行',
            '检查制冷剂压力是否过高',
            '更换控制器或压缩机'
        ],
        videoUrl: ''
    },
    4: {
        code: 'E4',
        title: '控制器低压保护',
        cause: '控制器端电压过低，导致无法维持运行',
        checks: ['电源线接头', '电源线插头'],
        solutions: [
            '检查电瓶桩头是否氧化或松动',
            '检查加长电源线是否过细',
            '测量开机负载下的实时电压'
        ],
        videoUrl: ''
    },
    5: {
        code: 'E5',
        title: '控制器内部故障',
        cause: '控制器自检发现硬件损坏或驱动失效',
        checks: ['控制器'],
        solutions: [
            '断电重启测试',
            '若持续报错请更换控制器'
        ],
        videoUrl: ''
    },
    6: {
        code: 'E6',
        title: '风机故障/过流',
        cause: '室外风机电流过载或反馈信号丢失',
        checks: ['室外风机'],
        solutions: [
            '检查风机插头是否松动',
            '清理风机叶片异物',
            '更换损坏的室外风机'
        ],
        videoUrl: ''
    },
    7: {
        code: 'E7',
        title: '压缩机缺相故障',
        cause: '压缩机三线中有一相接触不良或断路',
        checks: ['控制器', '压缩机', '连接线'],
        solutions: [
            '检查压缩机三线插头是否烧灼',
            '测量压缩机线圈阻值',
            '更换连接线或控制器'
        ],
        videoUrl: ''
    },
    8: {
        code: 'E8',
        title: '风机运行异常',
        cause: '风机转速反馈异常',
        solutions: [
            '检查风机信号线',
            '更换风机'
        ],
        videoUrl: ''
    },
    9: {
        code: 'E9',
        title: '排气压力过高保护',
        cause: '系统高压侧压力超过安全范围',
        solutions: [
            '检查冷凝器散热情况',
            '检查冷媒填充量是否过多'
        ],
        videoUrl: ''
    },
    10: {
        code: 'E10',
        title: '室外风机故障',
        cause: '风机电路反馈故障',
        solutions: [
            '检查风机保险连接',
            '更换控制器'
        ],
        videoUrl: ''
    }
};

module.exports = {
    FAULT_CODES
};
