# [4.0.0-beta.16](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.15...v4.0.0-beta.16) (2026-04-27)


### Bug Fixes

* **router:** 修复 mergePageOptions 函数参数处理 ([09298db](https://github.com/vitarx-lib/router/commit/09298dbe3b03bd6ba8c1bea5f1ccfa866d16f31c))
* **router:** 修复开发模式下路由初始化失败日志打印问题 ([a214217](https://github.com/vitarx-lib/router/commit/a214217f14d43f7779ffc1acf794ef9134c629f4))
* **router:** 修复路由生成时缺失的 isGroup 属性 ([92b0140](https://github.com/vitarx-lib/router/commit/92b0140d3c8cedacd820015d44eefbbce81c64be))


### Features

* **router:** 在路由生成流程中添加写入前钩子支持 ([986a509](https://github.com/vitarx-lib/router/commit/986a509292557222c8f327a1ea835913823b5565))
* **router:** 支持路径解析返回页面选项并合并页面配置 ([86bce58](https://github.com/vitarx-lib/router/commit/86bce58ae56e38579be31b49693c79f7d30b6fed))
* **router:** 添加 RouteNode 接口 isGroup 属性 ([9f61af8](https://github.com/vitarx-lib/router/commit/9f61af85a9acdcdc746689027ee1552bcb619702))



# [4.0.0-beta.14](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.13...v4.0.0-beta.14) (2026-04-26)


### Bug Fixes

* **router:** 修复 RouterView 组件视图名称处理问题 ([5c670c3](https://github.com/vitarx-lib/router/commit/5c670c3f3ba7f57b4cf3c2bb1635901f33479802))
* **router:** 修复初始化路由时错误日志记录问题 ([3f2d7cf](https://github.com/vitarx-lib/router/commit/3f2d7cfd3eebd064aab11957460010956385521a))
* **router:** 修复路由解析中视图命名默认值问题 ([9473455](https://github.com/vitarx-lib/router/commit/9473455703427025636dedf53287df35b7a5ce78))
* **router:** 修正导航状态枚举值编号错误 ([5a5878a](https://github.com/vitarx-lib/router/commit/5a5878ad50f2037852c3fefbff933925ecfbb04c))
* **router:** 修正路径解析结果注释描述 ([1e42734](https://github.com/vitarx-lib/router/commit/1e42734b20fed22087bead27227c9337e2250cac))



# [4.0.0-beta.13](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.12...v4.0.0-beta.13) (2026-04-24)


### Bug Fixes

* **file-router:** 支持字符串字面量作为对象属性键 ([3404bec](https://github.com/vitarx-lib/router/commit/3404becd556454084fc1bd72491a1a15871e5dc1))
* **router:** 修正 definePage 解析失败时的警告信息 ([0f50d88](https://github.com/vitarx-lib/router/commit/0f50d888363c9dd1ce073894a5532e5d65615ee2))



# [4.0.0-beta.12](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.11...v4.0.0-beta.12) (2026-04-24)


### Bug Fixes

* **router:** 修复重复路由检测逻辑 ([1832ca2](https://github.com/vitarx-lib/router/commit/1832ca28e918d682ca9a2a1838d8fa8a893fccd2))
* **router:** 添加哈希值修复hash配置无效问题 ([86e20c5](https://github.com/vitarx-lib/router/commit/86e20c5dd0135013e0cf4bd0b9b774ec67b3f048))



# [4.0.0-beta.11](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.10...v4.0.0-beta.11) (2026-04-19)


### Bug Fixes

* **router:** 修复预览模式下插件加载逻辑错误 ([d77752e](https://github.com/vitarx-lib/router/commit/d77752e2772538ac4acb779f2c03dcba5245687c))
* **router:** 改进文件变更错误日志输出 ([57b285f](https://github.com/vitarx-lib/router/commit/57b285f4b95ecab4cbfba3f052bacdf425c7af25))
* **router:** 简化路由插件错误处理逻辑 ([c636ffc](https://github.com/vitarx-lib/router/commit/c636ffc11081741ccddea0e1c4927dd193c5a8b4))



# [4.0.0-beta.10](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.9...v4.0.0-beta.10) (2026-04-16)


### Bug Fixes

* **router:** 修复vite插件导出无效BUG ([f04661a](https://github.com/vitarx-lib/router/commit/f04661abdcc41280cc54fa54140698a04261446c))



# [4.0.0-beta.9](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.8...v4.0.0-beta.9) (2026-04-16)


### Bug Fixes

* **router:** 修正自定义导入模式中的库名称错误 ([b546837](https://github.com/vitarx-lib/router/commit/b546837e9b315faa78f08e28334fb835c766d177))


### Features

* **router:** 支持自定义函数模式的组件导入模式 ([6aeec70](https://github.com/vitarx-lib/router/commit/6aeec70381ab429c5db3f81c524144fadcffc9a0))
* **router:** 支持路由管理器延迟加载能力 ([a5bf71f](https://github.com/vitarx-lib/router/commit/a5bf71f9afd2b417cf22dded44780cd4ee0818fa))



# [4.0.0-beta.8](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.7...v4.0.0-beta.8) (2026-04-15)


### Bug Fixes

* **router:** 移除文件路由管理器创建时的多余日志输出 ([3abb7f9](https://github.com/vitarx-lib/router/commit/3abb7f92a430877aaea7ca5236dba1384e365a5a))


### Features

* **vite:** 优化文件路由插件实现并完善文档注释 ([b736c42](https://github.com/vitarx-lib/router/commit/b736c42162d2204f9b006a3ec6fa707c111a0688))



# [4.0.0-beta.7](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.6...v4.0.0-beta.7) (2026-04-13)


### Bug Fixes

* **router:** 修复 group 为 true 时 prefix 结尾检查逻辑 ([0b813b3](https://github.com/vitarx-lib/router/commit/0b813b35fff330b7d186de24e22374213e36aff8))
* **router:** 修复导出检查中函数类型判断逻辑 ([a2788bd](https://github.com/vitarx-lib/router/commit/a2788bd7becae41c86c0d38619b5c6a419597970))



# [4.0.0-beta.6](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.5...v4.0.0-beta.6) (2026-04-13)


### Features

* **router:** 导出 GenerateResult 类型以支持类型推断 ([169c171](https://github.com/vitarx-lib/router/commit/169c171d6ed1635e6d8137203228af82a67f6b7a))



# [4.0.0-beta.5](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.4...v4.0.0-beta.5) (2026-04-12)


### Bug Fixes

* **router:** 修复扫描页面目录时不存在目录的处理 ([54fe121](https://github.com/vitarx-lib/router/commit/54fe121474e1fd12ec47d9858cd2e54aa9c2fc89))


### Features

* **router:** 导出并实现页面配置解析功能 ([64679df](https://github.com/vitarx-lib/router/commit/64679df0a7fbc2263622cb98b4d712719dec1f8c))
* **router:** 支持自定义组件导入模式 ([b5cf6a7](https://github.com/vitarx-lib/router/commit/b5cf6a716d7faee76c1bc42ee4c456937abf5433))



# [4.0.0-beta.4](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.3...v4.0.0-beta.4) (2026-04-10)


### Bug Fixes

* **router:** 修复路由生成器中懒加载导入语法错误 ([f4ea12f](https://github.com/vitarx-lib/router/commit/f4ea12f58fbb5ca951d0ccbcefe3d3cf500c6baa))


### Features

* **file-router:** 支持自定义路径解析器和路径解析错误处理 ([3d2712b](https://github.com/vitarx-lib/router/commit/3d2712b95534d55237f39126a2f25cac0094761c))



# [4.0.0-beta.3](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.2...v4.0.0-beta.3) (2026-04-09)


### Bug Fixes

* **router:** 优化布局文件识别逻辑 ([8b096ad](https://github.com/vitarx-lib/router/commit/8b096add7de95cccafafc7258347bbddd2175e42))
* **router:** 修复扫描时路由缓存未清除问题 ([0cb6b9e](https://github.com/vitarx-lib/router/commit/0cb6b9eda460021bebd105353205efb586f07cff))
* **router:** 修复页面文件变更时路由无效处理 ([5b21cd5](https://github.com/vitarx-lib/router/commit/5b21cd5607e1debea00869d543a7d40fc7661023))
* **router:** 增加页面目录访问权限检查 ([ec25060](https://github.com/vitarx-lib/router/commit/ec250607eb01f6c6b357c3bc0d3e9d312a97b0a9))
* **router:** 添加预览模式下跳过路由处理逻辑 ([8181adc](https://github.com/vitarx-lib/router/commit/8181adc739cb42e5d603b1b89f4a455f54b30d4e))
* **router:** 重置正则表达式状态以避免匹配错误 ([c53543f](https://github.com/vitarx-lib/router/commit/c53543fd68ef7522b9ac7dc546a86d2cbb1fd34c))


### Features

* **router:** 支持基于 _layout.jsx 的布局路由结构 ([85d38b4](https://github.com/vitarx-lib/router/commit/85d38b444eaaa71ca565c5a9ef71ccbd78ddc5d1))



# [4.0.0-beta.2](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.1...v4.0.0-beta.2) (2026-04-02)


### Bug Fixes

* **router:** 修改类型生成文件的注释和引用声明 ([19aba47](https://github.com/vitarx-lib/router/commit/19aba4733d097dc288679393f7c22b131e576517))
* **router:** 修正 package.json 中的路径和作者名称错误 ([a1aafcf](https://github.com/vitarx-lib/router/commit/a1aafcfce80acab241394155d75f322503fba584))


### Features

* **router:** 优化文件路由全局宏函数注释 ([6000741](https://github.com/vitarx-lib/router/commit/60007412e62a8928ae2c90f860727fbf186e12fc))
* **router:** 重构文件路由模块并新增导出检测和过滤工具 ([421bef5](https://github.com/vitarx-lib/router/commit/421bef5c0425d4c3426d0811910877ed946b38a4))



# [4.0.0-beta.1](https://github.com/vitarx-lib/router/compare/v4.0.0-beta.0...v4.0.0-beta.1) (2026-03-26)


### Bug Fixes

* **demo-auto-router:** 修正管理后台仪表盘路径映射 ([540e0b1](https://github.com/vitarx-lib/router/commit/540e0b14e7ef385198a8733e8e99637dda4ca292))
* **router:** 优化 RouterLink 组件的警告信息 ([248034f](https://github.com/vitarx-lib/router/commit/248034f722fd790e05f90b648a563d67529b1745))
* **router:** 优化滚动行为以防止竞态条件 ([11af2a2](https://github.com/vitarx-lib/router/commit/11af2a292278da0f6c61479f5d93b7f38719e586))
* **router:** 修复 leaveGuards 和 beforeUpdateHooks 的响应式问题 ([047e6f6](https://github.com/vitarx-lib/router/commit/047e6f6e7af67e2fc6df0264a3beebc6a328128b))
* **router:** 修复 Link 组件中路由目标处理及 href 生成逻辑 ([f6f68b9](https://github.com/vitarx-lib/router/commit/f6f68b98ab3d6ab55309e251b20f35914943b4b6))
* **router:** 修复 pathPrefix 处理逻辑 ([2a4a924](https://github.com/vitarx-lib/router/commit/2a4a9249bbcbd72bc082adcce75cd9383e9840a3))
* **router:** 修复 RouterView 组件索引注入及优化渲染逻辑 ([8867bf1](https://github.com/vitarx-lib/router/commit/8867bf1fe45ebc3d0f039b5dbe56dd9753c9c6b7))
* **router:** 修复RouterLink匹配路径为空的警告逻辑 ([eb66e34](https://github.com/vitarx-lib/router/commit/eb66e34d2dbcfad887f7ac923490be997683207f))
* **router:** 修复变量合并时非正则表达式的错误赋值 ([d20d154](https://github.com/vitarx-lib/router/commit/d20d1540732556676bf091bd5ce003ad773577ff))
* **router:** 修复导航成功后的组件加载和就绪处理逻辑 ([0ac4082](https://github.com/vitarx-lib/router/commit/0ac4082c286f2cb5b8cb786a56f8981e30b30c7c))
* **router:** 修复强制重新导航时传参错误 ([376be78](https://github.com/vitarx-lib/router/commit/376be78d3545c040155531810ce1f37d6baedd3a))
* **router:** 修复无匹配路由时的警告与阻止默认行为 ([7df7928](https://github.com/vitarx-lib/router/commit/7df7928d70357b8ae3d6513f633c6c5d4e271fb1))
* **router:** 修复离开守卫和路由更新钩子执行问题 ([33293b9](https://github.com/vitarx-lib/router/commit/33293b921de77078be57ac6c926a05330682d1a9))
* **router:** 修复路由匹配条件判定逻辑 ([1b5269c](https://github.com/vitarx-lib/router/commit/1b5269ca73bce3eb18025419121cdc1016d16d05))
* **router:** 修复路由缓存对象未响应式的问题 ([594bc83](https://github.com/vitarx-lib/router/commit/594bc83e2738ebec9fac949c5d24e4b1c0611a46))
* **router:** 修复路由重定向和导入功能逻辑问题 ([b2ba040](https://github.com/vitarx-lib/router/commit/b2ba040417e52b0ffdfd05dc195d155fd0724a7f))
* **router:** 修复重定向和别名配置的序列化问题 ([039db01](https://github.com/vitarx-lib/router/commit/039db010d6727bab01e75f8813ae29ffd1d4cc47))
* **router:** 修复销毁时未清空守卫和钩子的问题 ([ebe325b](https://github.com/vitarx-lib/router/commit/ebe325bf1e96f9715b492b6ebe61e05941f994b0))
* **router:** 修复锚点跳转时路由对象克隆问题 ([92879e8](https://github.com/vitarx-lib/router/commit/92879e8f490300df0f3bcd9ae35942d2025f3af3))
* **router:** 修改 RouterView 组件以修复路由匹配和属性处理 ([ed3de9a](https://github.com/vitarx-lib/router/commit/ed3de9ad08186e143452fce05e59153c209ba53e))
* **router:** 修正 RouteLeaveGuard 返回类型定义 ([4878232](https://github.com/vitarx-lib/router/commit/4878232111bc7d23562b383f246fa13ad6dcfcac))
* **router:** 修正 RouterLink 中的路由匹配警告逻辑 ([f5470f5](https://github.com/vitarx-lib/router/commit/f5470f50182ad7d23c5d88fb722952f6da1b55c4))
* **router:** 修正params类型断言 ([5b5bc9d](https://github.com/vitarx-lib/router/commit/5b5bc9d2358f8e44cac5ec87e3963f0af464f0e5))
* **router:** 修正初始导航就绪状态Promise逻辑 ([c14d63d](https://github.com/vitarx-lib/router/commit/c14d63d1d9a50261d30a65aa790b11d3ae0661c6))
* **router:** 修正导航目标校验函数名 ([96fcbc2](https://github.com/vitarx-lib/router/commit/96fcbc2154419493f89d79cb54b138d8f336e846))
* **router:** 修正滚动任务 ID 递增逻辑 ([593a062](https://github.com/vitarx-lib/router/commit/593a062f7ac070a633de1dc4cb62516871e7f1ba))
* **router:** 修正路径参数正则表达式处理逻辑 ([533b1c7](https://github.com/vitarx-lib/router/commit/533b1c755d3dc8553b7009866507aa2f96c0e852))
* **router:** 修正路径后缀和缺失路由处理逻辑 ([d3294bf](https://github.com/vitarx-lib/router/commit/d3294bffb8d0cf4892a1250791d5526e22b81733))
* **router:** 修正路由缓存键的选择逻辑 ([973be81](https://github.com/vitarx-lib/router/commit/973be816fef89a7c6f494a5b0fcfc31edb6aa5eb))
* **router:** 修正路由重定向目标类型定义 ([dab52e0](https://github.com/vitarx-lib/router/commit/dab52e07c2d397cd720b58be0ff841a3169f4e0e))
* **router:** 修正路由重定向类型定义 ([9e2a3aa](https://github.com/vitarx-lib/router/commit/9e2a3aae25bd9ca7f5ca6d44149ad8b3edca8671))
* **router:** 修正路由默认模式为 hash ([f7ef0bf](https://github.com/vitarx-lib/router/commit/f7ef0bfd5e30052a86bccf67fd014792f77ddf2a))
* **router:** 处理onError回调中的异常避免应用崩溃 ([a54c991](https://github.com/vitarx-lib/router/commit/a54c9910943bff84077dd27b121d72bb19e797dc))
* **router:** 防止无限重定向循环 ([e1768ed](https://github.com/vitarx-lib/router/commit/e1768eda134e1981f8e3285613c6065da216539a))


### Features

* **router:** 优化 RouterView 组件渲染逻辑 ([d9bde1c](https://github.com/vitarx-lib/router/commit/d9bde1c8017e87fe15df8bc5bee220fe314115c4))
* **router:** 优化异步组件解析逻辑 ([5d040d6](https://github.com/vitarx-lib/router/commit/5d040d63540c7b72fff671bbfa13a75c923c09b3))
* **router:** 增加路径变量提取与别名验证功能 ([431b4b5](https://github.com/vitarx-lib/router/commit/431b4b568eea18ccf895a9fd8181e368ab8f6340))
* **router:** 支持 RouterView children 回调传入当前路由信息 ([6d37736](https://github.com/vitarx-lib/router/commit/6d3773665c7fff44debad7001f230c939b7d8bad))
* **router:** 支持路由别名功能及相关管理优化 ([244e0ce](https://github.com/vitarx-lib/router/commit/244e0ce4e0554cf9e59cfea5d958741b47f69cb2))
* **router:** 支持路由别名映射功能 ([156eba6](https://github.com/vitarx-lib/router/commit/156eba6a3f951ca698086e07d4028a36751ea658))
* **router:** 支持路由路径前缀功能 ([e08dcab](https://github.com/vitarx-lib/router/commit/e08dcabe9e7e4e8fab2d2721d0330cfb59add67c))
* **router:** 支持页面配置中的 alias 属性 ([6a9c5ec](https://github.com/vitarx-lib/router/commit/6a9c5ec73b8eda7bbea6a59b8bb53f60f703cc24))
* **router:** 新增 useLink 链接助手实现路由导航功能 ([ad4305f](https://github.com/vitarx-lib/router/commit/ad4305f51d903dc6afe66d69c86f33f2bbc96259))
* **router:** 添加等待视图渲染完成的方法 ([11ca02b](https://github.com/vitarx-lib/router/commit/11ca02b62c3b40a65b6bdac9973231424c32927c))
* **router:** 添加获取解析路由记录数组的方法 ([7cda8e7](https://github.com/vitarx-lib/router/commit/7cda8e7d4002da8dbdca0fab152fcf477b9f141b))
* **router:** 添加路由命名策略配置和支持 ([c581ac3](https://github.com/vitarx-lib/router/commit/c581ac308993448b47763ec8a030469ccf38477b))



# [4.0.0-beta.0](https://github.com/vitarx-lib/router/compare/v3.0.0...v4.0.0-beta.0) (2026-03-12)


### Bug Fixes

* **core:** 解决inject-props类型断言错误 ([83fc288](https://github.com/vitarx-lib/router/commit/83fc2884308f04b99f9687536c707bc17a45dd9e))
* **router:** 修复 RouterLink 类型定义中的模板字面量错误 ([f1123d3](https://github.com/vitarx-lib/router/commit/f1123d386e62a400bd66f49ab19fb7b99a7985eb))
* **router:** 修复RouterView组件中props.key未设置的问题 ([be5cdd2](https://github.com/vitarx-lib/router/commit/be5cdd227fb4b64dffc473f0296b06855aa1bb02))
* **router:** 修复初始路由替换时未正确设置强制标志 ([f936737](https://github.com/vitarx-lib/router/commit/f93673793127f6fc658cb88f352bac481fc740c8))
* **router:** 修复动态路由匹配逻辑和/index兼容性 ([6af1747](https://github.com/vitarx-lib/router/commit/6af174711176ca80dfb43539274c11e1d28e508a))
* **router:** 修复单文件目录路由处理逻辑 ([36b3095](https://github.com/vitarx-lib/router/commit/36b3095ba8afdb81ea84945800926438a99476f2))
* **router:** 修复生成类型文件缺失导出问题 ([3ef471d](https://github.com/vitarx-lib/router/commit/3ef471dab3fe464580473c6508136ba07fc570e1))
* **router:** 修复路由历史索引初始化及清理逻辑 ([646279a](https://github.com/vitarx-lib/router/commit/646279a33d034344ae3c869879b1d56446056903))
* **router:** 修复路由器重复初始化问题 ([1c68239](https://github.com/vitarx-lib/router/commit/1c682391e33970d4974bfb81431490ee1234f34d))
* **router:** 修复路由导航及路径初始化问题 ([5bb506c](https://github.com/vitarx-lib/router/commit/5bb506c6133922d0a7419aa5661918a615fd7a40))
* **router:** 修复路由相关类型、历史记录和错误处理问题 ([77402f1](https://github.com/vitarx-lib/router/commit/77402f1921c67865ac2b3045ab0d0d7d14ac86a0))
* **router:** 修复路由重定向及子路由处理逻辑 ([9759be4](https://github.com/vitarx-lib/router/commit/9759be483fd5b79c08b970abc4430e6fff4f621d))
* **router:** 修复重定向处理器的返回类型定义 ([e50c67e](https://github.com/vitarx-lib/router/commit/e50c67ed40d51d0e5b67a1df53741cd0b326ae3b))
* **router:** 修改默认类型声明文件名 ([87e1252](https://github.com/vitarx-lib/router/commit/87e1252956a1ee6962c1f696c9a7a3aa085cdfc1))
* **router:** 修正 isDynamic 字段文档注释 ([b064b06](https://github.com/vitarx-lib/router/commit/b064b062c076ab65e06274d2a962ff4b16be3724))
* **router:** 修正 RouterView 组件渲染函数参数命名 ([421a04b](https://github.com/vitarx-lib/router/commit/421a04b49116ff4d8ecb6b74783c03529427c05c))
* **router:** 修正 typed-router.d.ts 文件路径 ([b8ef023](https://github.com/vitarx-lib/router/commit/b8ef0237592e4f9aea9a9e00343d2021797887a6))
* **router:** 修正初始fullPath避免重复检测 ([06d231b](https://github.com/vitarx-lib/router/commit/06d231bffc84fbe1d571de6149479d660fc4297a))
* **router:** 修正匹配返回值及重定向逻辑 ([05137c8](https://github.com/vitarx-lib/router/commit/05137c86ed8d88fad39877417b0e4b424c281110))
* **router:** 修正命名视图props的类型校验逻辑 ([cc84ea7](https://github.com/vitarx-lib/router/commit/cc84ea72c61519d5dcd0c43c0b0748e2935f586e))
* **router:** 修正强制导航参数名称及默认路径处理 ([133ba35](https://github.com/vitarx-lib/router/commit/133ba35d2fce61f0697614f6bde77aa03fd8ddbb))
* **router:** 修正热更新中强制替换参数名称 ([9d2725d](https://github.com/vitarx-lib/router/commit/9d2725d69deb8af1e486f26b66058a0f50f2ac00))
* **router:** 修正类型生成模块的导入路径错误 ([b7402f3](https://github.com/vitarx-lib/router/commit/b7402f3bc3c4174147c53bf21836211f4df0281a))
* **router:** 修正自动生成类型声明文件名 ([10d758e](https://github.com/vitarx-lib/router/commit/10d758efbfab8ba3833625988950da8336c6a629))
* **router:** 修正路由元数据类型声明模块名 ([eba5db4](https://github.com/vitarx-lib/router/commit/eba5db4d895399784b4a75fe15b29090fbf57b73))
* **router:** 修正默认路径匹配正则表达式 ([dbfde0b](https://github.com/vitarx-lib/router/commit/dbfde0b341e3351cb7c1ec77c4275caf1be16541))
* **router:** 允许路由重定向为字符串类型 ([0195997](https://github.com/vitarx-lib/router/commit/0195997db3992cf1047b1e8ee6d9fbd3276fb950))
* **router:** 支持可选动态参数格式匹配 ([ebf97c0](https://github.com/vitarx-lib/router/commit/ebf97c0e7a67787ddaeade62839fa91346046c42))
* **types:** 优化route.ts注入参数的注释说明 ([80b75ad](https://github.com/vitarx-lib/router/commit/80b75ad54c0aca3013ab87141424e0c1cf53b73e))


### Features

* **core:** 添加导航结果状态检查函数 ([3d0b913](https://github.com/vitarx-lib/router/commit/3d0b91376031407decc47759fe155d9cd1d18025))
* **demo-auto-router:** 添加动态路由与相关页面示例 ([867e212](https://github.com/vitarx-lib/router/commit/867e212e245fd7a49b467d9b334363a784d857e4))
* **demo-auto-router:** 添加演示示例与基础配置 ([e338a0e](https://github.com/vitarx-lib/router/commit/e338a0e63d5a023f9453103e04a722973e0af299))
* **demo:** 优化首页与关于页展示及内容 ([6b205da](https://github.com/vitarx-lib/router/commit/6b205da822bf7f7a69ab1055dc612e0e7dbc4694))
* **demo:** 新增demo项目基础页面和路由配置 ([1c4f381](https://github.com/vitarx-lib/router/commit/1c4f3810ffbcd046c6a4a8ba54f957da42950a73))
* **demo:** 添加路由元信息并动态设置页面标题 ([38560b3](https://github.com/vitarx-lib/router/commit/38560b3df08b332f4ad331269428a2dc6c125bb8))
* **router:** 优化获取路由器实例的异常处理逻辑 ([5e2bcf2](https://github.com/vitarx-lib/router/commit/5e2bcf26a56e2a5644fdb9c88fd6cdac692fd6d8))
* **router:** 优化路由规范化及动态参数校验 ([71c235e](https://github.com/vitarx-lib/router/commit/71c235e67e86b67dec538a71f29445bf2f9bdd47))
* **router:** 增加路由插件的导入模式和路由扩展功能 ([8b6289e](https://github.com/vitarx-lib/router/commit/8b6289e405d0390741ff8cfe555f656c4519f9dc))
* **router:** 实现路由热更新并支持更新后回调 ([c4efada](https://github.com/vitarx-lib/router/commit/c4efada13965e945623f6aec1b3fada0f448015d))
* **router:** 支持动态路由参数的正则 pattern 功能 ([d85f10c](https://github.com/vitarx-lib/router/commit/d85f10c10289cfcc0680e719c166e52ff281265f))
* **router:** 支持同名文件与目录组合的布局路由 ([c85f0e5](https://github.com/vitarx-lib/router/commit/c85f0e5710a783c14a0fefe339271190e9f2384f))
* **router:** 支持命名视图功能 ([ad51d7e](https://github.com/vitarx-lib/router/commit/ad51d7efea0b8c43786588a2e1d313f4d9220a1a))
* **router:** 支持强制导航跳过重复检查 ([41f74fe](https://github.com/vitarx-lib/router/commit/41f74fe9fa261fa233a4b02049dff836c420584d))
* **router:** 支持解析路由中的查询字符串 ([dbed9fd](https://github.com/vitarx-lib/router/commit/dbed9fd29b43b8571e4e2e89b08539502507d518))
* **router:** 支持路由名称和路径小写转换配置 ([e0f94d9](https://github.com/vitarx-lib/router/commit/e0f94d93a53f3f6ddfc4947bc3f210be38770cbe))
* **router:** 支持页面路由重定向配置 ([c4a3799](https://github.com/vitarx-lib/router/commit/c4a3799f25352aec0aaeab34ad08b91885301b80))
* **router:** 新增基于文件系统的自动路由生成功能 ([1ad8089](https://github.com/vitarx-lib/router/commit/1ad8089d040433183028df9c563294c647105056))
* **router:** 添加 definePage 函数用于页面配置定义 ([be4592e](https://github.com/vitarx-lib/router/commit/be4592e99e686182931b91c0f9d6f1b16075c019))
* **router:** 添加组件导入模式和路由扩展钩子功能 ([a7c9616](https://github.com/vitarx-lib/router/commit/a7c9616528770a79ec89316dde23b73d7a793664))
* **router:** 重构路由组件及核心逻辑 ([7468a40](https://github.com/vitarx-lib/router/commit/7468a40a368108801b46d7dcdf826458c825cc1e))
* **test:** 添加基于Playwright的浏览器测试配置 ([2b72d7e](https://github.com/vitarx-lib/router/commit/2b72d7eddc7647c51fb15bb78d52162aab836ef8))
* **vite:** 重新设计并优化 definePage 宏的处理逻辑 ([d0c26d0](https://github.com/vitarx-lib/router/commit/d0c26d05ffc580f5037bd152f533c8b87535121b))
* **vite:** 重构配置处理及验证，新增配置校验功能 ([29bcd7c](https://github.com/vitarx-lib/router/commit/29bcd7cd93091758a09df4bdca0e80418b6cb2c7))



# [3.0.0](https://github.com/vitarx-lib/router/compare/v2.0.1...v3.0.0) (2025-08-30)



## [2.0.1](https://github.com/vitarx-lib/router/compare/v2.0.0...v2.0.1) (2025-03-22)



# [2.0.0](https://github.com/vitarx-lib/router/compare/v1.0.3...v2.0.0) (2025-03-22)


### Bug Fixes

* **core:** 修复首页路由的 allowSuffix 判断逻辑 ([d4496ee](https://github.com/vitarx-lib/router/commit/d4496ee9f3eb932a54dd59159ce59e9c4003d262))
* **core:** 捕获并处理滚动到锚点异常 ([3a52236](https://github.com/vitarx-lib/router/commit/3a5223660140e967338bdfc87f1b8c7b6d86d77b))
* **core:** 更新属性时跳过 'key' 属性 ([47baf49](https://github.com/vitarx-lib/router/commit/47baf49db70cc7ccfe57873d0c7e7a7a7f113ea4))
* **RouterLink:** 支持路由锚点功能 ([343084a](https://github.com/vitarx-lib/router/commit/343084a6c50d02a7b075dbdf12a5d3fb2c244764))
* **RouterView:** 优化路由视图的参数更新逻辑 ([07c13e7](https://github.com/vitarx-lib/router/commit/07c13e7b7f346120153db669008753d24359a5b6))
* **router:** 修复字符串类型路由导航的返回值问题 ([7b66a11](https://github.com/vitarx-lib/router/commit/7b66a11c1bca4132009007640d26ad9292a7ff74))
* **router:** 修复导航到相同路由的判断逻辑 ([8a71971](https://github.com/vitarx-lib/router/commit/8a719718932936aadae3f15d991e9d78c2b3f8fa))


### Features

* **core:** 为动态路由组件添加唯一键值 ([b7ab402](https://github.com/vitarx-lib/router/commit/b7ab40232aff8c6fd97cc745af583cff62e15986))
* **core:** 增加字符串类型作为路由跳转目标 ([0960e21](https://github.com/vitarx-lib/router/commit/0960e2157dda65177e736c2685dc57f9ae9ea449))
* **core:** 添加 lazy 函数以支持懒加载组件 ([f4f2e4a](https://github.com/vitarx-lib/router/commit/f4f2e4a2804e7d348b7697198973ccbbe0f90713))
* **core:** 添加差异化更新属性功能 ([37b5d83](https://github.com/vitarx-lib/router/commit/37b5d831fcea3c3c60f4e5f12bd71f0caf57f566))
* **core:** 添加路由懒加载支持并优化文档 ([63aaf2d](https://github.com/vitarx-lib/router/commit/63aaf2da0f328aa0af8e8149ac750806b89b3677))
* **core:** 添加锚点滚动行为配置 ([4cb3bcb](https://github.com/vitarx-lib/router/commit/4cb3bcbe2dfd13525a074bab53236ab0eac74f73))
* **core:** 路由器实现 AppObjectPlugin 接口 ([bb447a0](https://github.com/vitarx-lib/router/commit/bb447a0e12ef67d428a8cf8f33a6e346bd995873))


### Performance Improvements

* **core:** 优化属性更新逻辑 ([3661e84](https://github.com/vitarx-lib/router/commit/3661e8485cbd3541da7c15364e8a4c4a809d6c2c))
* **core:** 优化属性更新逻辑 ([074a777](https://github.com/vitarx-lib/router/commit/074a777dcddbd23d199145dc73168e2742165ea2))



## [1.0.3](https://github.com/vitarx-lib/router/compare/v1.0.2...v1.0.3) (2025-03-12)


### Bug Fixes

* **router:** 优化导航逻辑并处理特殊场景 ([db35639](https://github.com/vitarx-lib/router/commit/db356391821a95ca15f7db09e6960826b0d244a3))
* **router:** 优化页面滚动和 URL 更新逻辑 ([899e299](https://github.com/vitarx-lib/router/commit/899e29946a2275d6f593f191d8dccb17aea35c75))
* **router:** 修复导航到相同路由时的 hash 更新问题 ([6fe59c5](https://github.com/vitarx-lib/router/commit/6fe59c546aebd8d24365aa1a6105a4355ce28b32))
* **router:** 修复路由跳转时未滚动到指定锚点的问题 ([ab465a2](https://github.com/vitarx-lib/router/commit/ab465a27db5a7fd7b5c599ac03d7a184d37feab3))


### Features

* **RouterLink:** 增加对锚点链接的支持 ([a8384dd](https://github.com/vitarx-lib/router/commit/a8384ddb2cee1df917c040049d8dd0923c8fb508))



## [1.0.2](https://github.com/vitarx-lib/router/compare/v1.0.1...v1.0.2) (2025-03-10)


### Bug Fixes

* **widgets:** 修复 RouterLink 组件无法跳转外链BUG ([5ab1c43](https://github.com/vitarx-lib/router/commit/5ab1c43bd254bfc9287e9c392d47f435c400985a))



## [1.0.1](https://github.com/vitarx-lib/router/compare/v1.0.0...v1.0.1) (2025-03-09)



# [1.0.0](https://github.com/vitarx-lib/router/compare/e613ac7ae110f17d6daac02409938304b97ae4e2...v1.0.0) (2025-03-08)


### Bug Fixes

* **core:** 修复 cloneRouteLocation 返回未克隆对象问题 ([03feb78](https://github.com/vitarx-lib/router/commit/03feb784a19509bff23bae0ffa8fcf45971fbf00))
* **core:** 修复 diffUpdateObjects 函数中的属性处理逻辑错误 ([a99181d](https://github.com/vitarx-lib/router/commit/a99181d2b68556551243c76be160dba3540c41ab))
* **core:** 修复 injectProps属性配置错误时的赋值问题 ([b0e187f](https://github.com/vitarx-lib/router/commit/b0e187fa1e1d8d9ba40792635845809bc5345b17))
* **core:** 修复根路径下index路由的匹配问题 ([b37a348](https://github.com/vitarx-lib/router/commit/b37a348bd4b2905a9614d20195b184c1f65b377d))
* **core:** 修复路由元数据的引用问题 ([7494544](https://github.com/vitarx-lib/router/commit/74945440f31980e5a9b041a8aa0555095ed6447c))
* **router-core:** 修复滚动到指定位置时的错误处理 ([455fe52](https://github.com/vitarx-lib/router/commit/455fe5215a6c8496ae1abd4bfdaf1c4bedb44310))
* **router:** 优化 hash 模式下的页面跳转逻辑 ([6079e64](https://github.com/vitarx-lib/router/commit/6079e64628fe782d8aea9e5acc5f5b03b059e938))
* **router:** 优化 hash值的处理 ([408823d](https://github.com/vitarx-lib/router/commit/408823d6e77bd714ebf9112087f965e61f5f2c9b))
* **router:** 优化 hash路由处理逻辑 ([67ba956](https://github.com/vitarx-lib/router/commit/67ba9562f513a0f5ee7133454321ed067fc27740))
* **router:** 优化 HistoryRouter锚点和查询参数更新逻辑 ([4a93a79](https://github.com/vitarx-lib/router/commit/4a93a790589aafbcb7003577f93e607a4d4c8ce8))
* **router:** 优化 URL 动态参数处理和 hash 格式化 ([8d43136](https://github.com/vitarx-lib/router/commit/8d431361a18a61fbee617da8bd3d7cf8ec534282))
* **router:** 优化 URL 解析逻辑 ([6ef8210](https://github.com/vitarx-lib/router/commit/6ef821039797cfd07baed44f0643da1174cb2b96))
* **router:** 优化 WebHistoryRouter 的状态管理 ([bea3f22](https://github.com/vitarx-lib/router/commit/bea3f22b6391d15eb6ac9318e1f9d4a6a76d16fa))
* **router:** 优化导航逻辑 ([313eebd](https://github.com/vitarx-lib/router/commit/313eebdcc51dfb3dfbd2e66c8330b4aed1d46c25))
* **router:** 优化格式化路径方法 ([28f9a91](https://github.com/vitarx-lib/router/commit/28f9a910fa3b16695ce537f78285ac9047529bdf))
* **router:** 优化浏览器历史记录管理 ([905e48f](https://github.com/vitarx-lib/router/commit/905e48f78dffb4aef8d270e287d25986d623ac2e))
* **router:** 优化滚动行为处理逻辑 ([f0a22c4](https://github.com/vitarx-lib/router/commit/f0a22c4171304766a5c90bb96fbd32e02398e505))
* **router:** 优化路径替换逻辑 ([98666e1](https://github.com/vitarx-lib/router/commit/98666e1a4d30979b3ace987f001b4a4ff5e1fb01))
* **router:** 优化路径格式化处理 ([ce9a1ae](https://github.com/vitarx-lib/router/commit/ce9a1ae45e7f1c032a766e040ef7ed2cb292c0a3))
* **router:** 优化路径格式化处理 ([20a19a1](https://github.com/vitarx-lib/router/commit/20a19a1e0ce3d22fc6a980c2e87f9d1a65387051))
* **router:** 优化路由匹配错误提示和初始化路由匹配逻辑 ([c9a10b7](https://github.com/vitarx-lib/router/commit/c9a10b75a3ae4d7847e326e83bdea544a75f4321))
* **router:** 优化路由注册逻辑并添加有效性检查 ([ea256b2](https://github.com/vitarx-lib/router/commit/ea256b2cde3d05126eaa3a180c1a28d412a3738a))
* **router:** 优化路由路径拼接逻辑 ([1b7dd65](https://github.com/vitarx-lib/router/commit/1b7dd6550cc70c39f37fd30895fee241c3a1c60b))
* **router:** 优化路由重复导航判断逻辑 ([51d1715](https://github.com/vitarx-lib/router/commit/51d1715890e69734d76285a08027690abd9d4b92))
* **router:** 修复 go 方法中的导航逻辑 ([3c6a380](https://github.com/vitarx-lib/router/commit/3c6a3803d4c20a640fb1d41914e0716e93abbd17))
* **router:** 修复 go 方法导致的多次导航问题 ([499ddd3](https://github.com/vitarx-lib/router/commit/499ddd38118c4d29c41bb642ed45c17e696730ba))
* **router:** 修复 hash 模式下查询字符串和 hash 的顺序 ([884860a](https://github.com/vitarx-lib/router/commit/884860aa8832ca5a85523b04d06328bad66a4ddf))
* **router:** 修复 HashRouter路由切换和初始化问题 ([5fde61e](https://github.com/vitarx-lib/router/commit/5fde61e155450ec52af8bc3beaf8cda525eab3ca))
* **router:** 修复 hash路由初始化和回退兼容性问题 ([e8d0220](https://github.com/vitarx-lib/router/commit/e8d0220c079459d53ad02fd3addfee04f30865a3))
* **router:** 修复 path 不一致时的导航状态更新问题 ([5f93655](https://github.com/vitarx-lib/router/commit/5f9365577706142824d10878256e96b5af85e0c9))
* **router:** 修复 RouterLink点击事件报错问题 ([983f496](https://github.com/vitarx-lib/router/commit/983f496851cfa52501f98c21bf0f7cbe19b2fd62))
* **router:** 修复 RouterLink组件 to 属性为空的问题 ([146616b](https://github.com/vitarx-lib/router/commit/146616b31ccf714ce5b6915618ec0a221fd7ccb1))
* **router:** 修复 URL转换函数以正确处理基于 base 的路径 ([fc83e8e](https://github.com/vitarx-lib/router/commit/fc83e8e05d5e5711ae82a7bc03195477786a286f))
* **router:** 修复分组路由重定向逻辑 ([1e42119](https://github.com/vitarx-lib/router/commit/1e42119d3aa255b5b7735c3b0f66d6a599e847e3))
* **router:** 修复删除路由后滚动行为异常的问题 ([abb1367](https://github.com/vitarx-lib/router/commit/abb1367d57acef23095e50806522f3ea5e3e0079))
* **router:** 修复后置守卫触发条件并优化守卫函数类型 ([f110272](https://github.com/vitarx-lib/router/commit/f110272ccba73a6f1dbfd6703b91ea009268d285))
* **router:** 修复哈希路由重定向逻辑 ([d11c8f8](https://github.com/vitarx-lib/router/commit/d11c8f86fc6bd63a5c6efce4e479b0aa0f027ed7))
* **router:** 修复嵌套路由路径拼接问题 ([2b29854](https://github.com/vitarx-lib/router/commit/2b29854136224aa508869efc9a7b94e7394e1836))
* **router:** 修复滚动到元素的位置 ([7e5a92a](https://github.com/vitarx-lib/router/commit/7e5a92a41bc633c09414992f2af4dcacecf44987))
* **router:** 修复滚动到元素的位置 ([b7b099c](https://github.com/vitarx-lib/router/commit/b7b099c071aa260f8e8a7ac5103c4323430c7bf7))
* **router:** 修复路由模式初始化逻辑 ([cffa551](https://github.com/vitarx-lib/router/commit/cffa551aac48763908ba535037bc730ec2f2c034))
* **router:** 修复路由视图元素创建逻辑 ([1035cb6](https://github.com/vitarx-lib/router/commit/1035cb648b3c1fc444bd62e89692cbb4d82be2da))
* **router:** 修复路由路径为空时的处理逻辑 ([9bcfc3b](https://github.com/vitarx-lib/router/commit/9bcfc3b32245991b97ae2f97c41b400bca657189))
* **router:** 修复路由路径格式化问题 ([b8ee010](https://github.com/vitarx-lib/router/commit/b8ee0109c3df31d6f67fea3d1d99657101c021e6))
* **router:** 修复路由重定向逻辑 ([bf10669](https://github.com/vitarx-lib/router/commit/bf1066939a04063a62d506feb57f014e484a0021))
* **router:** 修正可选变量路径的正则表达式 ([e0e0e7a](https://github.com/vitarx-lib/router/commit/e0e0e7a68725e7addcac84ed2ac5f2937a27eda3))
* **router:** 在不同环境下强制转换路由模式 ([ab3a7f5](https://github.com/vitarx-lib/router/commit/ab3a7f57d89589b7eb259ec1bf3adcfc003f8b7d))
* **router:** 校验 missing配置有效性 ([2b14b10](https://github.com/vitarx-lib/router/commit/2b14b102ae781eadbc6877fd8e1a88feb5a20d6b))
* **router:** 解码 URL 以处理特殊字符 ([e854ebc](https://github.com/vitarx-lib/router/commit/e854ebcc826a148db1091774c9f1ee1ae1d24294))
* **widgets:** 修复路由链接活跃状态判断逻辑 ([2ae68cc](https://github.com/vitarx-lib/router/commit/2ae68ccb72d4200369d52d9aa517c2e1a3f1e28c))


### Features

* **core:** 为 `index` 添加 `suffix` 属性并优化 `path` 文档说明 ([0c3309c](https://github.com/vitarx-lib/router/commit/0c3309cbc990d640e702e873e9bb588751c9ba87))
* **core:** 优化路径后缀处理并添加新功能 ([96e4e6c](https://github.com/vitarx-lib/router/commit/96e4e6cc67ae815d6bd48c2357bbdcd56de5875f))
* **core:** 优化路由注册表类并添加新功能 ([885027e](https://github.com/vitarx-lib/router/commit/885027eb3e412abac3f87d1fc2a2f33326a45eae))
* **core:** 优化路由注册逻辑 ([16c336b](https://github.com/vitarx-lib/router/commit/16c336b7d21e2767f81d0fd54606c075d3e40060))
* **core:** 优化路由配置和元数据类型定义 ([7c80d9d](https://github.com/vitarx-lib/router/commit/7c80d9d0f0b59b437e7a3dbcc7cc7e7bd5a451ea))
* **core:** 优化路由重定向逻辑 ([f42741c](https://github.com/vitarx-lib/router/commit/f42741c6db07994b54654a9d21cca66ec99dfbc4))
* **core:** 增加自定义路由参数注入功能并优化相关类型定义 ([eba28a6](https://github.com/vitarx-lib/router/commit/eba28a687299cb7b5e0744a584398106c80b648d))
* **core:** 添加对多后缀路由的支持 ([31446d7](https://github.com/vitarx-lib/router/commit/31446d7f86c433c04d0cfdca9e99f6532dc0fda1))
* **core:** 添加路由未匹配时的默认组件选项 ([b4f71a1](https://github.com/vitarx-lib/router/commit/b4f71a11a1757acf7e10501be2061c4425443506))
* **core:** 添加默认后缀功能并优化后缀处理 ([fb52625](https://github.com/vitarx-lib/router/commit/fb52625f936dc35da86f9565094c83d9f950d99e))
* **demo:** 添加 404 页面并优化路由配置 ([169bdf3](https://github.com/vitarx-lib/router/commit/169bdf3b2db243818c4e8527ce763bf6a24698f4))
* **RouterLink:** 增加对 http/https 外部链接的支持 ([4fdc02e](https://github.com/vitarx-lib/router/commit/4fdc02e0614db8ae6fc2e1a77bd6d154811727e3))
* **RouterLink:** 添加不可拖拽属性 ([ecccb88](https://github.com/vitarx-lib/router/commit/ecccb8898cc6be06457e472e8de7aee7916ef7aa))
* **RouterLink:** 添加导航回调函数 ([a40a823](https://github.com/vitarx-lib/router/commit/a40a823c3500f727cd0678a86aa02666ef447d53))
* **RouterLink:** 添加激活状态计算功能 ([54b9df7](https://github.com/vitarx-lib/router/commit/54b9df7835227d9847d90289cb40b83eb9226738))
* **router:** 优化 Web History路由器并支持哈希模式 ([989efd5](https://github.com/vitarx-lib/router/commit/989efd5a867f0848ded0dea460a7a282229f3541))
* **router:** 优化内存路由器功能并添加使用限制说明 ([717fd63](https://github.com/vitarx-lib/router/commit/717fd63fe7900b658a459f87ae9e81026621ddf9))
* **router:** 优化可选参数路由的处理逻辑 ([2d84f2b](https://github.com/vitarx-lib/router/commit/2d84f2bead66372b40e502287c9a4bcb66018eed))
* **router:** 优化类型推断并添加路由索引生成功能 ([c19e947](https://github.com/vitarx-lib/router/commit/c19e947fadf79ee309b1f7b5baa7edd707ba94dc))
* **router:** 优化路径匹配并支持 index.html 兼容性 ([376ea85](https://github.com/vitarx-lib/router/commit/376ea85454f406af776a7f2e6bf85fa3710ec1d5))
* **router:** 优化路由匹配逻辑 ([5227c6e](https://github.com/vitarx-lib/router/commit/5227c6e6487d805fc46c477e16937ee070abca93))
* **router:** 优化路由跳转逻辑并添加新功能 ([29074bc](https://github.com/vitarx-lib/router/commit/29074bc47c11fdc7aca50592758a0de72abe68b9))
* **router:** 保存页面滚动位置 ([a12845c](https://github.com/vitarx-lib/router/commit/a12845c4d27126edab3fa998114369a83ee339b5))
* **router:** 在 NavigateData 中添加 isRedirect 字段 ([40c0e9e](https://github.com/vitarx-lib/router/commit/40c0e9e01a27bdede721d1849e1eff5ef64ddcfd))
* **router:** 增加后缀验证和路由规范化更新 ([54cf455](https://github.com/vitarx-lib/router/commit/54cf4553f9367827eb39a5df845eea15f17b7189))
* **router:** 增加路由参数匹配模式配置 ([13c0cf8](https://github.com/vitarx-lib/router/commit/13c0cf86b0554f248e657f01d20e3967ae0a1a87))
* **router:** 增加路由后缀配置并优化相关文档 ([e7e717e](https://github.com/vitarx-lib/router/commit/e7e717e738129e38f02f5b5bd31021ee536cbb34))
* **router:** 增加路由模式的兼容性处理 ([db5bc4c](https://github.com/vitarx-lib/router/commit/db5bc4cf7edc42ab8593c66a83f884dc1caa4a9b))
* **router:** 增加路由重定向功能并优化路由配置 ([fad8a9e](https://github.com/vitarx-lib/router/commit/fad8a9e0fb97f043e0da6204149d817014a96cf5))
* **router:** 完善路由守卫功能并优化配置项类型定义 ([ac7ad4d](https://github.com/vitarx-lib/router/commit/ac7ad4d51f2edc2b435ea2dee30afeb48336db4e))
* **router:** 完善路由跳转逻辑 ([2c9a32c](https://github.com/vitarx-lib/router/commit/2c9a32c9f5ef8bec3f1361ec5925f7b5e4bc9b45))
* **router:** 实现 HashRouter 的 go 方法并优化路由跳转逻辑 ([678dc4a](https://github.com/vitarx-lib/router/commit/678dc4ad4e0653a1d270fe659d8930ce898a8538))
* **router:** 实现基于 window.history 的路由器 ([597d1fe](https://github.com/vitarx-lib/router/commit/597d1fedacd92af4041d65a8f83e9985a4bca050))
* **router:** 实现路由对象的补丁更新功能 ([01948d3](https://github.com/vitarx-lib/router/commit/01948d32c1eb7aaf00d77e776c19164a6c697c27))
* **router:** 实现路由导航和历史管理功能 ([78ead12](https://github.com/vitarx-lib/router/commit/78ead125916d2c21c775f43a27da1a167e522674))
* **router:** 实现路由的添加、删除和匹配功能 ([93e18e4](https://github.com/vitarx-lib/router/commit/93e18e42e6b0093b79b463af18a7375614c555bc))
* **router:** 新增 hash 模式路由器 ([d14ae27](https://github.com/vitarx-lib/router/commit/d14ae27d4a28ff730f8d90c8b2f38cd8e649baf2))
* **router:** 新增路由规范化和可选变量计数功能 ([dd3f94c](https://github.com/vitarx-lib/router/commit/dd3f94c92654f919308bad4d586acd5030bc96d5))
* **router:** 更新路由导出并添加新路由类型 ([1bc7171](https://github.com/vitarx-lib/router/commit/1bc717135e1a9192bf310a6b20a377290c2f1885))
* **router:** 更新路由模块导出方式 ([825846f](https://github.com/vitarx-lib/router/commit/825846f9a800a76c712dd4665e8d16d2e1722a13))
* **router:** 添加 HashRouter 类实现基于哈希的路由管理 ([1c02516](https://github.com/vitarx-lib/router/commit/1c02516ddf600d5bfe38e8fe7cb8b8e913d9cbf2))
* **router:** 添加 HistoryRouter 构造函数并优化滚动行为 ([602e428](https://github.com/vitarx-lib/router/commit/602e428b6577ee6bd0e9b29638706a95693a9926))
* **router:** 添加 lazy 函数支持延迟加载 ([07771d9](https://github.com/vitarx-lib/router/commit/07771d99c2864b1ca591624794eaa62af383cecc))
* **router:** 添加 MemoryRouter 类实现了一个基于内存的路由类 ([e75db6c](https://github.com/vitarx-lib/router/commit/e75db6c8152e74c55c078174077fce43ae945fbf))
* **router:** 添加 RouterLink 组件 ([d5c76d6](https://github.com/vitarx-lib/router/commit/d5c76d62813439f3bd87026d932d624f931a91e7))
* **router:** 添加 useRoute助手函数 ([8f23d27](https://github.com/vitarx-lib/router/commit/8f23d27475846bfa1ca4db057b57e3bdea4ba4e4))
* **router:** 添加 utils 模块导出 ([6ffc160](https://github.com/vitarx-lib/router/commit/6ffc160f07f2af382807fa43bcb41ebae713ed5a))
* **router:** 添加全局路由后置钩子并优化类型定义 ([88b379e](https://github.com/vitarx-lib/router/commit/88b379e24b6817db1e1fb749985d2e03c0705c2c))
* **router:** 添加拆分路径和后缀的工具函数 ([80f3235](https://github.com/vitarx-lib/router/commit/80f3235cb28bb6f205f0ec0d93a9a69ea40244e5))
* **router:** 添加查询字符串和哈希处理工具 ([88a1001](https://github.com/vitarx-lib/router/commit/88a100101a1ed5bba840447d9fa1e183e81dc3a2))
* **router:** 添加浅比较函数 ([7af80dd](https://github.com/vitarx-lib/router/commit/7af80dd3dbd0fd16d777f7d3603b80512a49813f))
* **router:** 添加滚动行为并优化导航逻辑 ([812045c](https://github.com/vitarx-lib/router/commit/812045c7090c24282d34e552abb0352fce4fcc22))
* **router:** 添加滚动行为配置 ([e3c85ef](https://github.com/vitarx-lib/router/commit/e3c85ef6470f88622bb3a458b5ae247c1f84ee98))
* **router:** 添加生成路由索引的工具函数 ([df950da](https://github.com/vitarx-lib/router/commit/df950da7dcccf43b3d9a9d3903b39b1b85700b0c))
* **router:** 添加生成路由索引的工具函数 ([6458ffe](https://github.com/vitarx-lib/router/commit/6458ffe433b601c5ec97e8e7e6b252cc7dff4bbb))
* **router:** 添加自定义滚动行为支持 ([1e7460a](https://github.com/vitarx-lib/router/commit/1e7460a40abb07bd9407b94ab8ab9cb2b404c121))
* **router:** 添加获取路径后缀的工具函数 ([bf319ce](https://github.com/vitarx-lib/router/commit/bf319ce2402fdabeab38dee8c86141d170ce05da))
* **router:** 添加路径后缀名支持 ([af3541f](https://github.com/vitarx-lib/router/commit/af3541f6e781ff5dfb8e20d38a8f56fb93b1a751))
* **router:** 添加路径后缀支持 ([5808ab6](https://github.com/vitarx-lib/router/commit/5808ab63c83d3870a528b25ea01602f4c0ffec65))
* **router:** 添加路由元数据支持并优化路由更新逻辑 ([1748912](https://github.com/vitarx-lib/router/commit/1748912cea7c05f0f01a91747bbcd1a2feaad607))
* **router:** 添加路由实用函数 ([d4a8fce](https://github.com/vitarx-lib/router/commit/d4a8fce06e254a8d7228fc296af1ff6effcdfcc8))
* **router:** 添加路由视图方法并支持懒加载 ([a3b1f4a](https://github.com/vitarx-lib/router/commit/a3b1f4a8790febc0adb926d3cd02e27197627a55))
* **router:** 添加路由组件的前置和后置钩子支持 ([a2727f0](https://github.com/vitarx-lib/router/commit/a2727f04ec4d0ba893f36343cbd330e51462eff6))
* **router:** 添加路由路径生成和延迟加载功能 ([aa47159](https://github.com/vitarx-lib/router/commit/aa47159107d80de06dc28ffce6f52a593e4aea0f))
* **router:** 添加路由辅助函数 ([e18d464](https://github.com/vitarx-lib/router/commit/e18d4643875ddbb3af0e5c36850019af7e705d23))
* **router:** 重构路由器基类并添加单例模式 ([3f50d2c](https://github.com/vitarx-lib/router/commit/3f50d2c513cba5e6b2f7851e9fcd6a60fdd8fec7))
* **router:** 重构路由类型定义并添加新功能 ([b24aeea](https://github.com/vitarx-lib/router/commit/b24aeea696d708cf81c4d21f7850315774e391af))
* **type-make:** 添加路由索引类型生成工具 ([4577910](https://github.com/vitarx-lib/router/commit/4577910ad7e599c9d1558a015e243f2f62624fd7))
* **widget:** 添加 RouterLink 组件导出 ([60ae73e](https://github.com/vitarx-lib/router/commit/60ae73e090f805980a0d663bde828286fc65bc1d))
* **widget:** 重构 RouterView组件 ([70eba11](https://github.com/vitarx-lib/router/commit/70eba1130a6983d8308b7c3207bed31108294d1b))
* 创建 vitarx-router项目 ([e613ac7](https://github.com/vitarx-lib/router/commit/e613ac7ae110f17d6daac02409938304b97ae4e2))


### Performance Improvements

* **core:** 优化路由匹配性能并增加异常处理 ([537b408](https://github.com/vitarx-lib/router/commit/537b40863de6cdcd802a13b2d0818e00c7a00ef5))
* **router:** 优化内存路由的历史记录管理 ([f24570a](https://github.com/vitarx-lib/router/commit/f24570a491cdaf4fa4c4c4285dd70ef8e2a9604c))
* **router:** 优化路由元数据处理 ([6b0b0b1](https://github.com/vitarx-lib/router/commit/6b0b0b15cae3f22fbc28fdb474b62904b194953f))
* **router:** 优化路由匹配和导航逻辑 ([63ec4e1](https://github.com/vitarx-lib/router/commit/63ec4e1247e06c0715233c1a0cb7ade4e508b454))



