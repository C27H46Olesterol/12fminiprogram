Component({
    data: {
        selected: 0,
        color: "#999999",
        selectedColor: "#1677ff",
        list: [{
            pagePath: "/pages/client/index/index",
            text: "首页",
            iconPath: "/images/tabbar/homes.png",
            selectedIconPath: ""
        },
        //  {
        //     pagePath: "/pages/client/product-news/product-news",
        //     text: "发现",
        //     iconPath: "/images/tabbar/progress.png",
        //     selectedIconPath: "/images/tabbar/progress-active.png"
        // }, 
        {
            pagePath: "/pages/client/remote/remote",
            text: "遥控器",
            iconPath: "/images/tabbar/remote.png",
            selectedIconPath: ""
        }, 
        // {
        //     pagePath: "/pages/client/faq/faq",
        //     text: "自助",
        //     iconPath: "/images/tabbar/faq.png",
        //     selectedIconPath: "/images/tabbar/faq-active.png"
        // }, 
        {
            pagePath: "/pages/profile/profile",
            text: "我的",
            iconPath: "/images/tabbar/profile.png",
            selectedIconPath: "/images/tabbar/profile-active.png"
        }]
    },
    methods: {
        switchTab(e) {
            const data = e.currentTarget.dataset
            const url = data.path
            wx.switchTab({ url })
            this.setData({
                selected: data.index
            })
        }
    }
})
