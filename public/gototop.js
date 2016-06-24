/**
 *  Copyright (c) 2015 Scrd (https://github.com/shenchao890216)
 *  Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 *
 *  Version 0.0.2(Beta)
 */

;(function($) {
    // 默认js使用自己的样式
    $.gotop = function(options) {
        // 默认参数.
        var defaults = {
            'containerClass': 'gotop-container',        // gotop包裹元素的class.
            'arrowClass': 'arrowClass',                 // 箭头元素的class.
            'containerSize': 40,                        // gotop包裹元素的大小.
            'containerRadius': 6,                      // gotop包裹元素的边框圆角.
            'containerColor': '#000',                   // gotop包裹元素的背景色.
            'containerTransparent':'0.5',               // gotop包裹元素的透明度
            'arrowColor': '#fff',                       // 箭头元素的背景色.
            'location': 'right',                        // gotop靠哪边.
            'locationOffset': 20,                       // gotop靠边缘的距离.
            'bottomOffset': 60,                         // gotop靠底部的距离.
            'alwaysVisible': false,                     // 是否一直可见.
            'speed': 'slow',                            // 动画速度.
            'trigger': 500                              // 距离顶部多少显示gotop.
        };
        // 合并参数.
        var options = $.extend(defaults, options);
        // 添加gotop元素.
        $('body').append('<div class="' + options.containerClass + '" style="display: none;"></div>');
        var $gotopContainer = $('.' + options.containerClass);
        $gotopContainer.html('<div class="' + options.arrowClass + '"></div>');
        var $gotopArrow = $('.' + options.arrowClass);

        // 检查参数.
        if(options.location != 'right' && options.location != 'left') {
            options.location = 'right';
        }

        (options.locationOffset < 0) && (options.locationOffset = 0);

        (options.bottomOffset < 0) && (options.bottomOffset = 0);

        (options.trigger < 0) && (options.trigger = 500);

        (options.containerSize < 20) && (options.containerSize = 20);

        (options.containerRadius < 0) && (options.containerRadius = 0);

        var checkColor = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
        
        !checkColor.test(options.containerColor) && (options.containerColor = '#000');

        !checkColor.test(options.arrowColor) && (options.arrowColor = '#fff');

        // gotop包裹元素的css样式.
        var containerStyle = {
            'position': 'fixed',
            // options.location: options.locationOffset + 'px',
            'bottom': options.bottomOffset + 'px',
            'width': options.containerSize + 'px',
            'height': options.containerSize + 'px',
            'background-color': options.containerColor,
            'opacity':options.containerTransparent,
            'cursor': 'pointer',
            'border-radius': options.containerRadius
        };
        containerStyle[options.location] = options.locationOffset + 'px';
        
        $gotopContainer.css(containerStyle);
        // 箭头的样式.
        var borderSize = 0.25 * options.containerSize,
            arrowStyle = {
                'width': 0,
                'height': 0,
                'padding-top': ((options.containerSize - 3 * borderSize) / 2) + 'px',
                'margin': '0 auto',
                'border-style': 'solid',
                'border-width': borderSize + 'px',
                'border-color': 'transparent transparent ' + options.arrowColor + ' transparent'
            };
        // 设置箭头的css.
        $gotopArrow.css(arrowStyle);
        // 滚动事件.
        if(!options.alwaysVisible) {
            $(window).scroll(function() {
                if($(window).scrollTop() >= options.trigger) {
                    $gotopContainer.fadeIn();
                } else {
                    $gotopContainer.fadeOut();
                }
            });
            $.ajaxSetup({
                complete:function(){
                    $(window).scroll(function() {
                        if($(window).scrollTop() >= options.trigger) {
                            $gotopContainer.fadeIn();
                        } else {
                            $gotopContainer.fadeOut();
                        }
                    });
                }
            })
        } else {
            $gotopContainer.fadeIn();
        }
        // 单击事件.
        var notClicked = true;
        $gotopContainer.click(function() {
            if(notClicked) {
                notClicked = false;
                $('html,body').animate({'scrollTop': 0}, options.speed, function() {
                    notClicked = true;
                });
            }
        });
    };

    // 元素实现，用户自己定制样式和结构.
    $.fn.gotop = function(options) {
        // 默认参数.
        var defaults = {
            'alwaysVisible': false,
            'trigger': 500
        };
        // 合并用户参数.
        var options = $.extend(defaults, options);
        // 是否点击了.
        var notClicked = true;
        // 功能实现.
        return this.each(function() {
            var _obj = $(this);

            if(!options.alwaysVisible) {
                $(window).scroll(function() {
                    if($(window).scrollTop() >= options.trigger) {
                        _obj.show();
                    } else {
                        _obj.hide();
                    }
                });
            } else {
                _obj.show();
            }
            // 单击事件.
            _obj.click(function() {
                if(notClicked) {
                    notClicked = true;
                    $('html,body').animate({'scrollTop': 0}, options.speed, function() {
                        notClicked = true;
                    });
                }
            });
        });
    };
})(jQuery);
$(function() {
    $.gotop({
        'containerColor': -1
    });
    // $('#footer').gotop();
});