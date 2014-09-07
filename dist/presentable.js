/* boring Legal Stuff
 ***********************************************************************************************************************
 Copyright (c) 2012, Frederick C. Feibel
 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 following conditions are met:

 Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 disclaimer.
 Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
 disclaimer in the documentation and/or other materials provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **********************************************************************************************************************/
(function(window, document) {
var util = function () {
        return {
            querySelectorChild: function (parentElement, childSelector) {
                var tempId, child;
                if (!parentElement.id) {
                    tempId = 'tempId_' + Math.floor(Math.random() * 1000 * new Date().getUTCMilliseconds());
                    parentElement.id = tempId;
                }
                child = parentElement.querySelector('#' + parentElement.id + ' > ' + childSelector);
                if (tempId) {
                    parentElement.removeAttribute('id');
                }
                return child;
            },
            extend: function (a, b) {
                var i;
                for (i in b) {
                    if (b.hasOwnProperty(i)) {
                        a[i] = b[i];
                    }
                }
            },
            findHref: function (container, event) {
                var target;
                event.stopPropagation();
                event.preventDefault();
                target = event.target;
                while (container !== target) {
                    if (target.href && target.tagName === 'A') {
                        return target.href;
                    }
                    target = target.parentNode;
                }
            },
            goToSlide: function (URL, reload) {
                if (!URL) {
                    return;
                }
                window.location = URL;
                if (reload) {
                    window.location.reload();
                }
            }
        };
    }();
var options = function (util) {
        var defaultOptions = {
                data: { 'slides': [] },
                framework: '',
                iconContainer: '#presentable-icon',
                keyCode: 84,
                noTitle: 'Untitled Slide',
                hideNoTitle: false,
                reload: false,
                titles: 'h1,h2,h3,.presentable-title',
                tocContainer: '#presentable-toc',
                urlHash: '#'
            }, frameworkOptions = {
                revealjs: { urlHash: '#/' },
                html5slides: { reload: true },
                io2012slides: { reload: true }
            }, init = function (userOptions) {
                if (userOptions.framework) {
                    util.extend(defaultOptions, frameworkOptions[userOptions.framework]);
                    util.extend(defaultOptions, userOptions);
                } else if (userOptions.data) {
                    util.extend(defaultOptions, userOptions);
                } else {
                    throw { message: 'You must provide a value for framework or data.' };
                }
            }, getOption = function (optionName) {
                return defaultOptions[optionName];
            }, getAll = function () {
                return defaultOptions;
            }, slideDataExists = function () {
                return this.getOption('data').slides.length > 0;
            };
        return {
            init: init,
            getOption: getOption,
            getAll: getAll,
            slideDataExists: slideDataExists
        };
    }(util);
var jsonBuilderFactory = function (util) {
        var frameworks, factory, jsonBuilder;
        factory = function (options) {
            util.extend(jsonBuilder, frameworks[options.getOption('framework')]);
            jsonBuilder.init(options);
            return jsonBuilder;
        };
        jsonBuilder = {
            TITLE_SEARCH_STRING: '',
            UNTITLED_SLIDE_TEXT: '',
            TOC_CONTAINER: '',
            init: function (options) {
                this.TITLE_SEARCH_STRING = options.getOption('titles');
                this.UNTITLED_SLIDE_TEXT = options.getOption('noTitle');
                this.TOC_CONTAINER = options.getOption('tocContainer');
            },
            slideTitle: function (slide) {
                var titleElement = slide.querySelector(this.TITLE_SEARCH_STRING);
                if (titleElement) {
                    return titleElement.textContent.replace(/</g, '&lt;');
                } else {
                    return this.UNTITLED_SLIDE_TEXT;
                }
            },
            isTocSlide: function (slide) {
                return slide.querySelector(this.TOC_CONTAINER);
            },
            create: function () {
                var slides, slideCount, slideData, tocArray, i;
                slides = document.querySelectorAll(this.SLIDE_SEARCH_STRING);
                tocArray = [];
                slideCount = slides.length;
                for (i = 0; i < slideCount; i++) {
                    slideData = {};
                    slideData.index = this.slideIndex(slides[i], i);
                    slideData.title = this.slideTitle(slides[i]);
                    if (this.isTocSlide(slides[i])) {
                        slideData.toc = 'true';
                    }
                    tocArray.push(slideData);
                }
                return tocArray;
            }
        };
        frameworks = {};
        frameworks.revealjs = {
            SLIDE_SEARCH_STRING: '.slides > section',
            create: function () {
                var sections, sectionCount, tocArray, i;
                sections = document.querySelectorAll(this.SLIDE_SEARCH_STRING);
                tocArray = [];
                sectionCount = sections.length;
                for (i = 0; i < sectionCount; i++) {
                    this.processSectionRecursive(i, sections[i], tocArray);
                }
                this.removeNestedDuplicatesByTitles(tocArray);
                this.removeUntitledFirstChild(tocArray);
                return tocArray;
            },
            isTocSlide: function (slide) {
                return util.querySelectorChild(slide, this.TOC_CONTAINER);
            },
            processSectionRecursive: function (slideIndex, slide, tocArray) {
                var slideData, sectionCount, i;
                slideData = {};
                slideData.index = slideIndex;
                slideData.title = this.slideTitleRecursive(slide);
                if (this.isTocSlide(slide)) {
                    slideData.toc = 'true';
                }
                tocArray.push(slideData);
                var childSections = slide.querySelectorAll('section');
                if (childSections.length === 0) {
                    return;
                }
                slideData.nested = [];
                sectionCount = childSections.length;
                for (i = 0; i < sectionCount; i++) {
                    this.processSectionRecursive(slideIndex + '/' + i, childSections[i], slideData.nested);
                }
            },
            slideTitleRecursive: function (slide) {
                var firstTitle, childSlide;
                firstTitle = slide.querySelector(this.TITLE_SEARCH_STRING);
                if (firstTitle && firstTitle.parentNode === slide) {
                    return firstTitle.textContent;
                }
                childSlide = slide.querySelector('section');
                if (childSlide) {
                    return this.slideTitleRecursive(childSlide);
                }
                return this.UNTITLED_SLIDE_TEXT;
            },
            removeNestedDuplicatesByTitles: function (tocArray) {
                var i, parentSlide, firstChildSlide;
                for (i = 0; i < tocArray.length; i++) {
                    parentSlide = tocArray[i];
                    if (!parentSlide.nested) {
                        continue;
                    }
                    firstChildSlide = parentSlide.nested[0];
                    if (parentSlide.title === firstChildSlide.title && firstChildSlide.title !== this.UNTITLED_SLIDE_TEXT) {
                        parentSlide.nested.shift();
                    }
                }
            },
            removeUntitledFirstChild: function (tocArray) {
                var i, parentSlide, firstChildSlide;
                for (i = 0; i < tocArray.length; i++) {
                    parentSlide = tocArray[i];
                    if (!parentSlide.nested) {
                        continue;
                    }
                    firstChildSlide = parentSlide.nested[0];
                    if (firstChildSlide.title === this.UNTITLED_SLIDE_TEXT) {
                        parentSlide.nested.shift();
                    }
                }
            }
        };
        frameworks.html5slides = {
            SLIDE_SEARCH_STRING: 'article',
            slideIndex: function (slide, i) {
                return i + 1;
            }
        };
        frameworks.io2012slides = {
            SLIDE_SEARCH_STRING: 'slide:not([hidden=""])',
            slideIndex: function (slide, i) {
                return i + 1;
            }
        };
        frameworks.shower = {
            SLIDE_SEARCH_STRING: '.slide',
            slideIndex: function (slide) {
                return slide.id;
            }
        };
        frameworks.impressjs = {
            SLIDE_SEARCH_STRING: '.step',
            slideIndex: function (slide, i) {
                if (slide.id) {
                    return slide.id;
                }
                return 'step-' + (i + 1);
            }
        };
        return factory;
    }(util);
var html = function () {
        return {
            HASH_STRING: '',
            init: function (options) {
                this.HASH_STRING = options.urlHash;
                this.HIDE_NO_TITLE = options.hideNoTitle;
                this.NO_TITLE_TEXT = options.noTitle;
            },
            createRecursive: function (listParent, tocArray) {
                var ol, li, url, i;
                ol = document.createElement('ol');
                listParent.appendChild(ol);
                for (i = 0; i < tocArray.length; i++) {
                    if (this.HIDE_NO_TITLE && tocArray[i].title === this.NO_TITLE_TEXT) {
                        continue;
                    }
                    li = document.createElement('li');
                    url = this.HASH_STRING + tocArray[i].index;
                    li.innerHTML = '<div><a class="title" href="' + url + '">' + tocArray[i].title + '</a> <a class="index" href="' + url + '" >' + tocArray[i].index + '</a></div>';
                    ol.appendChild(li);
                    if (tocArray[i].nested) {
                        this.createRecursive(li, tocArray[i].nested);
                    }
                }
                return listParent;
            }
        };
    }();
var toc = function (util, html) {
        return {
            reload: false,
            toc: null,
            init: function (options) {
                html.init(options.getAll());
                this.tocContainer = document.querySelector(options.getOption('tocContainer'));
                this.reload = options.getOption('reload');
                this.slideData = options.getOption('data').slides;
                this.create();
                this.inject();
            },
            create: function () {
                this.toc = html.createRecursive(document.createDocumentFragment(), this.slideData);
            },
            inject: function () {
                var self = this;
                this.tocContainer.addEventListener('click', function (event) {
                    var href = util.findHref(this, event);
                    util.goToSlide(href, self.reload);
                }, false);
                this.tocContainer.appendChild(this.toc);
            }
        };
    }(util, html);
var icon = function (util) {
        return {
            init: function (options) {
                var iconContainer = document.querySelector(options.getOption('iconContainer'));
                if (iconContainer) {
                    iconContainer.addEventListener('click', function (event) {
                        var href = util.findHref(this, event);
                        util.goToSlide(href, options.getOption('reload'));
                    }, false);
                }
            }
        };
    }(util);
var keyBoardNav = function (util) {
        return {
            tocSlideHref: '',
            keyCode: '',
            reload: false,
            init: function (options) {
                if (options.getOption('keyCode') !== false) {
                    var tocSlideData = this.tocSlideDataRecursive(options.getOption('data').slides);
                    this.tocSlideHref = options.getOption('urlHash') + tocSlideData.index;
                    this.keyCode = options.getOption('keyCode');
                    this.reload = options.getOption('reload');
                    this.enableKeyboardNavigation();
                }
            },
            tocSlideDataRecursive: function (tocArray) {
                for (var i = 0; i < tocArray.length; i++) {
                    if (tocArray[i].toc) {
                        return tocArray[i];
                    }
                    if (tocArray[i].nested) {
                        return this.tocSlideDataRecursive(tocArray[i].nested);
                    }
                }
                throw { message: 'Table of Contents container not found in presentation.' };
            },
            enableKeyboardNavigation: function () {
                var self = this;
                window.document.body.addEventListener('keyup', function (event) {
                    var keyPressed;
                    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.altKey || event.ctrlKey || event.metaKey) {
                        return;
                    }
                    event.preventDefault();
                    keyPressed = event.keyCode || event.which;
                    if (keyPressed === self.keyCode) {
                        util.goToSlide(self.tocSlideHref, self.reload);
                    }
                }, false);
            }
        };
    }(util);
(function (options, jsonBuilderFactory, toc, icon, keyBoardNav) {
    var log = console.log || function () {
        }, main = {
            init: function (userOptions) {
                var jsonBuilder;
                try {
                    options.init(userOptions);
                    if (!options.slideDataExists()) {
                        jsonBuilder = jsonBuilderFactory(options);
                        options.getOption('data').slides = jsonBuilder.create();
                    }
                    toc.init(options);
                    keyBoardNav.init(options);
                    icon.init(options);
                } catch (e) {
                    log('Presentable: ' + e.message);
                    log(options.getOption('data').slides);
                }
            },
            slideTitleRecursive: function (index, tocArray, title) {
                title = title || '';
                tocArray = tocArray || options.getOption('data').slides;
                for (var i = 0; i < tocArray.length; i++) {
                    if (tocArray[i].index === index) {
                        title = tocArray[i].title;
                    }
                    if (tocArray[i].nested) {
                        title = main.slideTitlesRecursive(index, tocArray[i].nested, title);
                    }
                }
                return title;
            }
        };
    if (typeof define === 'function' && define.amd) {
        window.define(function () {
            return {
                toc: main.init,
                slideTitle: main.slideTitleRecursive
            };
        });
    } else {
        window.presentable = {
            toc: main.init,
            slideTitle: main.slideTitleRecursive
        };
    }
}(options, jsonBuilderFactory, toc, icon, keyBoardNav));}(window, document) );