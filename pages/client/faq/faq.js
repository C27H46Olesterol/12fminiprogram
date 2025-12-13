// pages/client/faq/faq.js
const app = getApp();

Page({
  data: {
    searchKeyword: '',
    activeTab: 'error', // error: 故障码, common: 常见故障
    errorCodes: [], // 故障码列表
    commonIssues: [], // 常见故障列表
    filteredItems: [],
    currentPlayingVideo: null // 当前正在播放的视频ID
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
  },

  onLoad() {
    this.loadData();
  },

  // 加载数据
  loadData() {
    const errorCodes = this.getErrorCodesData();
    const commonIssues = this.getCommonIssuesData();

    this.setData({
      errorCodes,
      commonIssues
    });

    this.filterItems();
  },

  // 获取故障码数据
  getErrorCodesData() {
    // 临时视频URL（示例）
    const tempVideoUrl = 'https://vod.pipi.cn/fec9203cvodtransbj1251246104/ccff07ce5285890807898977876/v.f42906.mp4';
    const tempVideoUrl2 = 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/issue-images/6000-E2.mp4';

    return [
      {
        id: 'E2',
        code: 'E2',
        name: '过流保护',
        problem: '控制器检测电流过大，压缩机、冷凝风扇电机短路，控制器内部短路',
        videoSources: [
          { url: tempVideoUrl2, label: '6000系', poster: '' },
          { url: tempVideoUrl, label: '2000系', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>空调制冷启动，在报故障码前观察冷凝风扇工作情况</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title-sub">冷凝风扇无启动现象</div>
              <p>把电子扇的接线端去掉，使用对应电压的电源直接启动冷凝风扇</p>
              <div class="sub-step">1.1 冷凝风扇能正常启动 → 更换控制器</div>
              <div class="sub-step">1.2 冷凝风扇不能启动 → 更换电子扇</div>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title-sub">冷凝风扇启动后停止</div>
              <p>更换控制器，若还报相同故障则压缩机内部短路，更换压缩机</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false,
        videoLoaded: false
      },
      {
        id: 'E3',
        code: 'E3',
        name: '堵转保护',
        problem: '系统内部压力过大或供电问题导致压缩机电机不能正常工作',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>空调正常启动，在报故障码前观察压缩机工作情况</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title-sub">压缩机抖动几秒后停止</div>
              <p>检查压缩机和控制器的三根相线是否断路</p>
              <div class="sub-step">线路没问题 → 优先更换控制器（使用压缩机强起工具）</div>
              <div class="sub-step">压缩机仍不能启动 → 更换压缩机</div>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title-sub">压缩机工作一段时间后停止</div>
              <div class="sub-step">2.1 检查冷凝器散热，观察风扇转速</div>
              <div class="sub-step">2.2 检查系统压力：</div>
              <div class="detail">• 高低压同时高 → 散热问题</div>
              <div class="detail">• 高压高低压正常 → 冷媒过多，释放至正常范围</div>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false,
        videoLoaded: false
      },
      {
        id: 'E4',
        code: 'E4',
        name: '低电压保护',
        problem: '控制器检测电源输入电压低于最低要求',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决办法：</div>
          <p>在控制器电源接线处测量正负极间电压值</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <p>测量电压正常 → 控制器内部问题，直接更换控制器</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <p>测量电压低于要求值 → 检查电源状态，线路是否接触良好</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false,
        videoLoaded: false
      },
      {
        id: 'E5',
        code: 'E5',
        name: '控制器故障',
        problem: '控制器内部问题',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p class="simple-solution">直接更换控制器</p>
        </div>`,
        expanded: false,
        videoLoaded: false,
        videoLoaded: false
      },
      {
        id: 'E6',
        code: 'E6',
        name: '冷凝风扇故障',
        problem: '冷凝风扇因电机问题或扇叶被异物阻挡导致不能正常工作',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>把冷凝风扇接线端从控制器上去掉，使用对应电压电源直接启动</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title-sub">冷凝风扇正常工作</div>
              <p>检查接线端是否接触不良，重新固定后仍不工作 → 更换控制器</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title-sub">冷凝风扇不能工作</div>
              <p>更换冷凝风扇。无风扇情况下启动仍报E6 → 同时更换控制器</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'E7',
        code: 'E7',
        name: '压缩机缺相',
        problem: '压缩机三相供电不正常导致压缩机不能启动',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>把控制器端三根压缩机供电线路断开，测量两两之间是否常通</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <p>存在断路 → 检查线路两端，如线路正常则压缩机内部断路，更换压缩机</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <p>均常通 → 测量控制器接线端，有不通则更换控制器。都通则检查是否短路</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'E8',
        code: 'E8',
        name: '压缩机温度保护',
        problem: '压缩机温度过高',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p class="simple-solution">参考E6，检查散热系统</p>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'E9',
        code: 'E9',
        name: '压力开关保护',
        problem: '压力开关故障',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p class="simple-solution">参考E6，检查散热系统</p>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'LU',
        code: 'LU',
        name: '低电压保护',
        problem: '内机控制面板检测输入电压低于保护电压',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>通过遥控器或控制面板查询当前识别电压和保护电压，测量实际电压</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <p>显示电压远低于实际 → 测量控制面板电源线电压是否一致</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <p>显示与实际一致 → 检查线路接触、保险丝两端是否虚接</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'HU',
        code: 'HU',
        name: '电压过高',
        problem: '内机控制面板检测输入电压高于建议范围',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p class="simple-solution">确定电源电压与机器建议电压一致</p>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'OPE',
        code: 'OPE',
        name: '温度传感器断路',
        problem: '温度传感器没有插入、故障或控制面板内部故障',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>通过遥控器或控制面板查询当前出风和进风温度</p>
          <div class="step-item">
            <div class="step-content">
              <p>显示OPE → 对应传感器断路，更换传感器</p>
              <p>更换后仍OPE → 控制面板内部故障，更换控制面板</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'SHr',
        code: 'SHr',
        name: '温度传感器故障',
        problem: '温度传感器或控制面板故障',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>通过遥控器或控制面板查询出风和进风温度</p>
          <div class="step-item">
            <div class="step-content">
              <p>拔掉显示SHr对应的传感器：</p>
              <div class="sub-step">显示OPE → 传感器故障，更换传感器</div>
              <div class="sub-step">仍显示SHr → 控制面板故障，更换控制面板</div>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'AC',
        code: 'AC',
        name: '制冷故障',
        problem: '空调不能正常制冷',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>正常启动空调，测试出现故障码前能否正常制冷</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <p>不能制冷 → 空调缺冷媒，测试是否有漏点，补充冷媒</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <p>可以制冷 → 查询进出风温度是否正常，如极高温度说明传感器故障</p>
            </div>
          </div>
          <div class="notice">注：不同型号间故障码代表的故障问题会有差别</div>
        </div>`,
        expanded: false,
        videoLoaded: false
      }
    ];
  },

  // 获取常见故障数据
  getCommonIssuesData() {
    // 临时视频URL（示例）
    const tempVideoUrl = 'https://vd3.bdstatic.com/mda-mhkku3x5j5qj8h7x/1080p/cae_h264/1631785014295255617/mda-mhkku3x5j5qj8h7x.mp4';
    const tempVideoUrl2 = 'https://vd3.bdstatic.com/mda-mhkku3x5j5qj8h7x/1080p/cae_h264/1631785014295255617/mda-mhkku3x5j5qj8h7x.mp4';

    return [
      {
        id: 'issue1',
        title: '空调内机不吹风',
        problem: '内机风机不工作或控制面板故障',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>测量内机控制面板对风机输出电压是否正常</p>
          <div class="step-item">
            <div class="step-content">
              <p>电压正常 → 检查线路是否断路，更换蒸发风机</p>
              <p>电压不正常 → 更换内机控制面板</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'issue2',
        title: '空调吹风但没有冷风',
        problem: '制冷系统未启动或冷媒不足',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <p>检查制冷模式是否打开，A/C绿灯是否常亮，设置温度是否低于进风温度</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <p>设置正常、A/C灯常亮 → 检查外机是否工作</p>
              <div class="sub-step">外机不工作 → 测量控制线电压</div>
              <div class="sub-step">外机工作 → 测量系统压力，检查是否缺冷媒</div>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'issue3',
        title: '遥控器/语音功能有问题',
        problem: '遥控器或语音模块故障',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title-sub">遥控器问题</div>
              <p>不灵敏或响应不匹配 → 优先更换遥控器</p>
              <p>问题仍存在 → 考虑更换控制面板</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title-sub">语音功能问题</div>
              <p>能响应但无语音回复 → 更换喇叭</p>
              <p>没有任何反应 → 断电重启，观察是否有提示音</p>
              <div class="sub-step">无提示音 → 更换话筒和喇叭</div>
              <div class="sub-step">有提示音 → 仅更换话筒</div>
              <div class="sub-step">更换后仍有问题 → 更换控制面板</div>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'issue4',
        title: '空调打不开',
        problem: '空调或内机控制面板没有通电',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <div class="step-item">
            <div class="step-content">
              <p>检查外机控制器指示灯是否闪烁</p>
              <p>测量控制器端电源线电压是否正常</p>
              <p>指示灯闪烁或电压正常 → 检查内机供电</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      },
      {
        id: 'issue5',
        title: '空调漏水',
        problem: '排水系统堵塞或安装问题',
        videoSources: [
          { url: tempVideoUrl, label: '视频1', poster: '' },
          { url: tempVideoUrl2, label: '视频2', poster: '' }
        ],
        currentVideoIndex: 0,
        solution: `<div class="solution-steps">
          <div class="step-title">解决方法：</div>
          <p>去掉内机出风罩检查水从何处漏进来</p>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-content">
              <div class="step-title-sub">出风口/进风口漏水</div>
              <div class="sub-step">1.1 内机蒸发芯体结冰 → 查询出风温度，不正常则更换传感器</div>
              <div class="sub-step">1.2 蒸发箱负压导致 → 清洗进风滤网，检查挡水条安装</div>
            </div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-content">
              <div class="step-title-sub">下雨漏水</div>
              <p>机器抬起检查海绵条是否安装好，防水胶是否打好</p>
            </div>
          </div>
        </div>`,
        expanded: false,
        videoLoaded: false
      }
    ];
  },

  // Tab切换
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab,
      searchKeyword: '' // 切换时清空搜索
    });
    this.filterItems();
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterItems();
  },

  // 筛选数据
  filterItems() {
    const { activeTab, errorCodes, commonIssues, searchKeyword } = this.data;
    let items = activeTab === 'error' ? [...errorCodes] : [...commonIssues];

    if (searchKeyword.trim() !== '') {
      const keyword = searchKeyword.toLowerCase();
      items = items.filter(item => {
        const searchText = activeTab === 'error'
          ? `${item.code} ${item.name} ${item.problem}`.toLowerCase()
          : `${item.title} ${item.problem}`.toLowerCase();
        return searchText.includes(keyword);
      });
    }

    this.setData({ filteredItems: items });
  },

  // 切换展开状态
  onToggleItem(e) {
    const id = e.currentTarget.dataset.id;
    const { filteredItems, currentPlayingVideo } = this.data;

    // 如果有正在播放的视频，先暂停它
    if (currentPlayingVideo) {
      const videoContext = wx.createVideoContext(currentPlayingVideo, this);
      videoContext.pause();
    }

    const updatedItems = filteredItems.map(item => {
      if (item.id === id) {
        const newExpanded = !item.expanded;
        // 展开时标记视频已加载，收起时保持加载状态
        return {
          ...item,
          expanded: newExpanded,
          videoLoaded: newExpanded ? true : item.videoLoaded
        };
      }
      return item;
    });

    this.setData({
      filteredItems: updatedItems,
      currentPlayingVideo: null // 清除当前播放状态
    });
  },

  // 切换视频源
  onSwitchVideoSource(e) {
    const itemId = e.currentTarget.dataset.itemId;
    const sourceIndex = parseInt(e.currentTarget.dataset.sourceIndex);
    const { filteredItems, errorCodes, commonIssues, activeTab, currentPlayingVideo } = this.data;

    // 验证索引有效性
    const targetItem = filteredItems.find(item => item.id === itemId);
    if (!targetItem || !targetItem.videoSources || sourceIndex < 0 || sourceIndex >= targetItem.videoSources.length) {
      console.error('视频源索引无效:', { itemId, sourceIndex, videoSources: targetItem?.videoSources });
      return;
    }

    // 如果当前项有正在播放的视频，先暂停
    if (currentPlayingVideo && currentPlayingVideo.startsWith(`video-${itemId}-`)) {
      const videoContext = wx.createVideoContext(currentPlayingVideo, this);
      videoContext.pause();
    }

    // 更新filteredItems
    const updatedFilteredItems = filteredItems.map(item => {
      if (item.id === itemId) {
        return { ...item, currentVideoIndex: sourceIndex };
      }
      return item;
    });

    // 同步更新原始数据源
    if (activeTab === 'error') {
      const updatedErrorCodes = errorCodes.map(item => {
        if (item.id === itemId) {
          return { ...item, currentVideoIndex: sourceIndex };
        }
        return item;
      });
      this.setData({
        filteredItems: updatedFilteredItems,
        errorCodes: updatedErrorCodes,
        currentPlayingVideo: null // 切换视频源时清除播放状态
      });
    } else {
      const updatedCommonIssues = commonIssues.map(item => {
        if (item.id === itemId) {
          return { ...item, currentVideoIndex: sourceIndex };
        }
        return item;
      });
      this.setData({
        filteredItems: updatedFilteredItems,
        commonIssues: updatedCommonIssues,
        currentPlayingVideo: null // 切换视频源时清除播放状态
      });
    }
  },

  // 视频播放事件
  onVideoPlay(e) {
    const videoId = e.currentTarget.id;
    console.log('视频开始播放:', videoId);

    const { currentPlayingVideo } = this.data;

    // 如果有其他视频正在播放，先暂停它
    if (currentPlayingVideo && currentPlayingVideo !== videoId) {
      const oldVideoContext = wx.createVideoContext(currentPlayingVideo, this);
      oldVideoContext.pause();
    }

    // 更新当前播放的视频ID
    this.setData({
      currentPlayingVideo: videoId
    });
  },

  // 视频暂停事件
  onVideoPause(e) {
    const videoId = e.currentTarget.id;
    console.log('视频暂停:', videoId);

    // 如果暂停的是当前播放的视频，清除状态
    if (this.data.currentPlayingVideo === videoId) {
      this.setData({
        currentPlayingVideo: null
      });
    }
  },

  // 视频错误事件
  onVideoError(e) {
    console.error('视频播放错误:', e.detail);
    wx.showToast({
      title: '视频加载失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 联系客服
  onContactService() {
    wx.makePhoneCall({
      phoneNumber: '400-888-8888',
      success: () => {
        console.log('拨打客服电话成功');
      },
      fail: (err) => {
        console.error('拨打客服电话失败:', err);
        app.showError('拨打电话失败');
      }
    });
  }
});
