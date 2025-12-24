Component({
  data: {
    selected: 0,
    color: "#7A7E83",
    selectedColor: "#1677ff",
    list: [{
      pagePath: "/pages/index",
      text: "首页",
      iconPath: "/images/logo.png",
      selectedIconPath: "/images/logo.png"
    }, {
      pagePath: "/pages/client/index/index",
      text: "遥控",
      iconPath: "/images/icons/power.png",
      selectedIconPath: "/images/icons/power.png"
    }, {
      pagePath: "/pages/profile/profile",
      text: "我的",
      iconPath: "/images/icons/menu.png",
      selectedIconPath: "/images/icons/menu.png"
    }]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      // this.setData({
      //   selected: data.index
      // })
    }
  }
})
