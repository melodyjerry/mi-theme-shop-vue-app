<template>
    <div class="gallery-screen" v-flex:direction="'column'">
        <div class="header" v-flex.centerY>
            <NavBar
              :navItems="navItems"
              :selectedNav="currentNavIndex"
              @clickNavItem="selectNavByIndex"
              class="nav-list-wrapper"
              v-flex-item.1
            >
            </NavBar>
            <Icon type="search" v-flex-item.0 class="search-button" @click="gotoSearch"></Icon>
        </div>
        <keep-alive>
          <SwiperActivity
            ref="swiper"
            @indexChange="onSwiperIndexChange"
            :selected="currentNavIndex"
            v-flex-item.1
          >
              <Item
                v-for="item in swiperItems"
                :key="item.index"
                :extra="item.index"
                class="view-content"
              >
                <component :is="item.component" />
              </Item>
          </SwiperActivity>
        </keep-alive>
    </div>
</template>

<script>
import SwiperActivity from '@/components/app/swiper-activity/activity'
import Item from '@/components/app/swiper-activity/item'
import ThemeWallpaperView from '@views/home/gallery/theme-wallpaper'
import FontView from '@views/home/gallery/font'
import RingtoneView from '@views/home/gallery/ringtone'
import NavBar from '@/components/app/nav-bar'
import navigationBar from '@/mixins/navigation'
import Icon from '@/components/app/icons'

const navComponentMap = {
  theme: 'ThemeWallpaperView',
  font: 'FontView',
  ringtone: 'RingtoneView'
}

export default {
    name: 'Gallery',
    mixins: [navigationBar],
    components: { NavBar, Icon, Item, SwiperActivity, ThemeWallpaperView, FontView, RingtoneView },

    data() {
      return {
        swiperItems: []
      }
    },

    created() {
      let swiperItems = []
      this.navItems.forEach((n, index) => {
        let componentName = navComponentMap[n.name]
        if (componentName) {
          swiperItems.push({
            index,
            component: componentName
          })
        }
      })
      this.swiperItems = swiperItems
    },

    methods: {
      onSwiperIndexChange(_, navIndex) {
        this.selectNavByIndex(navIndex)
      },

      /* selectNavByIndex(idx) {
        this.selectNavByIndex = idx
      }, */

      gotoSearch() {
        this.$router.push({ name: 'search', query: { type: this.currentNavName } })
      }
    },

    beforeRouteLeave(to, cur, nxt) {
      if (!to.path.includes('intro')) {
        nxt(true)
      } else {
        nxt(false)
      }
    }

    /* beforeRouteLeave(to, from, next) {
      // this.savedScrollBar = this.
      let elSwiper = this.$refs.swiper.$el
      let childItem = elSwiper.querySelector('.swiper-activity-item-wrapper')
      if (childItem) {
        debugger
        this.savedScroll = childItem.scrollTop
      }
      next()
    } */
}
</script>

<style scoped>
.header {
  padding: 0 10px;
}
</style>
