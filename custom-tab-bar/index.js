Component({
  data: {
    selected: 0,
    color: "#7A7E83",
    selectedColor: "#1677ff",
    list: [{
      pagePath: "/pages/index",
      text: "首页",
      iconPath: "/images/icons/home.png",
      selectedIconPath: "/images/icons/home.png"
    }, {
      pagePath: "/pages/client/index/index",
      text: "遥控",
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
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      // this.setData({
      //   selected: data.index
      // })
    }
  }
})
