// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: "#8e8e93", // 稍微浅一点的灰，更显现代感
    selectedColor: "#1890ff", // 品牌蓝
    list: [{
      pagePath: "/pages/index",
      text: "工作台",
      iconPath: "/images/icons/desk.png",
      selectedIconPath: "/images/icons/desk.png"
    }, {
      pagePath: "/pages/client/index/index",
      text: "遥控器",
      iconPath: "/images/icons/remote.png",
      selectedIconPath: "/images/icons/remote.png"
    }, {
      pagePath: "/pages/profile/profile",
      text: "我的",
      iconPath: "/images/icons/user.png",
      selectedIconPath: "/images/icons/user.png"
    }]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;

      // 添加轻微震动反馈
      wx.vibrateShort({ type: 'light' });

      wx.switchTab({
        url: url
      });
    }
  }
})
