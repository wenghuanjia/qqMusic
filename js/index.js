let musicRender = (function () {
    let $headerBox = $('.headerBox'),
        $contentBox = $('.contentBox'),
        $footerBox = $('.footerBox'),
        $wrapper = $contentBox.find('.wrapper'),
        $lyricList = null,
        musicAudio = $('#musicAudio')[0],
        $playBtn = $headerBox.find('.playBtn'),
        $already = $footerBox.find('.already'),
        $duration = $footerBox.find('.duration'),
        $current = $footerBox.find('.current');
    // 计算出contentBox区域的高度
    let computedContent = function computedContent() {
        let winH = document.documentElement.clientHeight,
            font = parseFloat(document.documentElement.style.fontSize);
        $contentBox.css({
            height: winH - $headerBox[0].offsetHeight - $footerBox[0].offsetHeight - 0.8 * font
        })
    };
    // 获取歌词
    let queryLyric = function queryLyric() {
        return new Promise(resolve => {
            $.ajax({
                url: 'json/lyric.json',
                methods: 'get',
                dataType: 'json',
                success: resolve
            })
        });
    };
    // 绑定歌词数据
    let bindHTML = function bindHTML(lyricAry) {
        let str = ``;
        lyricAry.forEach(item => {
            let {
                minutes,
                seconds,
                content
            } = item;
            // 数据绑定的时候把歌词对应的分钟和秒设置为自定义属性存储起来，后期需要使用直接获取即可
            str += `<p data-minutes="${minutes}" data-seconds="${seconds}">${content}</p>`;
        })
        $wrapper.html(str);
        $lyricList = $wrapper.find('p');
    };
    // 开始播放
    // 发布订阅设计模式
    let $plan = $.Callbacks();
    let playRun = function playRun() {
        // musicAudio.play();
        // 报错：Uncaught (in promise) DOMException
        // 原因：浏览器禁止了音视频的自动播放
        // 解决
        // add start
        document.body.addEventListener('mousedown', function(){
            musicAudio.play();
        }, false);
        // add end
        musicAudio.addEventListener('canplay', $plan.fire);
    };
    // 控制暂停播放
    $plan.add(() => {
        $playBtn.css('display', 'block').addClass('move');
        $playBtn.tap(() => {
            if (musicAudio.paused) {
                // 暂停状态
                musicAudio.play();
                $playBtn.addClass('move');
                return;
            }
            musicAudio.pause();
            $playBtn.removeClass('move');
        })
    })
    // 控制进度条
    $plan.add(() => {
        // 获取总时长 单位是 s
        let duration = musicAudio.duration;
        $duration.html(computedTime(duration));
        // 随时监听播放状态
        autoTimer = setInterval(() => {
            let currentTime = musicAudio.currentTime;
            if (currentTime >= duration) {
                // 播放完成
                clearInterval(autoTimer);
                $already.html(computedTime(duration));
                $current.css('width', '100%');
                // 暂停
                musicAudio.pause();
                // 按钮 移除样式
                $playBtn.removeClass('move');
                return;
            }
            // 正在播放中
            $already.html(computedTime(currentTime));
            $current.css('width', currentTime / duration * 100 + '%');
            matchLyric(currentTime);
        }, 1000);
    })
    // 计算时间 秒切换分钟
    let computedTime = function computedTime(time) {
        let minutes = Math.floor(time / 60),
            seconds = Math.floor(time - minutes * 60);
        minutes < 10 ? minutes = '0' + minutes : null;
        seconds < 10 ? seconds = '0' + seconds : null;
        return `${minutes}:${seconds}`;
    };
    // 匹配歌词，实现歌词对应
    let translateY = 0;
    let matchLyric = function matchLyric(currentTime) {
        // currentTime: 已经播放的时间
        let [minutes, seconds] = computedTime(currentTime).split(':');
        // 在歌词集合中选出我们想要展示的
        let $cur = $lyricList.filter(`[data-minutes="${minutes}"]`).filter(`[data-seconds="${seconds}"]`)
        if ($cur.length === 0) return;
        // 当前歌词已经被选中了(例如，这句歌词可能需要五秒才能播放完成，我们定时器监听五次，第一次设置后，后面四s就不用重新设置了)
        if($cur.hasClass('active')) return;
        $cur.addClass('active').siblings().removeClass('active');
        let index = $cur.index();
        if (index > 4) {
            // 已经对应超过了四条歌词了，接下来每当对应一条就让wrapper向上移动一行
            let curH = $cur[0].offsetHeight;
            translateY -= curH;
            $wrapper.css('transform', `translateY(${translateY}px)`);
        }
    };
    return {
        init: function () {
            computedContent();
            let promise = queryLyric();
            promise.then(result => {
                let {
                    lyric = ''
                } = result,
                obj = {
                    32: ' ',
                    40: '(',
                    41: ')',
                    45: '-'
                };
                // 去掉歌词中的特殊符号 #32; 32
                lyric = lyric.replace(/&#(\d+);/g, (...arg) => {
                    let [item, num] = arg;
                    item = obj[num] || item;
                    // 上一个 then 方法中返回的结果会作为下一个 then 实参传递过去
                    return item;
                });
                return lyric;
            }).then(lyric => {
                // lyric: 上一次处理好的结果
                // 把歌词对应的分钟、秒、歌词内容等信息依次存储起来
                // 向歌词末尾追加结束符号
                lyric += '&#10;';
                let lyricAry = [],
                    reg = /\[(\d+)&#58;(\d+)&#46;\d+\]([^&#]+)&#10;/g;
                lyric.replace(reg, (...arg) => {
                    let [, minutes, seconds, content] = arg;
                    lyricAry.push({
                        minutes,
                        seconds,
                        content
                    })
                });
                return lyricAry;
            }).then(bindHTML).then(playRun);
        }
    }
})();
musicRender.init();
