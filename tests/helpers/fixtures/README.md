# PDF 页面整理合成样例

organizer-red-blue.jp2 为本项目自行生成的32×32红蓝图，不含第三方图像或用户内容。生成器为 scripts/generate-pdf-organizer-fixture.m，使用macOS CoreGraphics/ImageIO；测试只读取已生成文件，不要求CI具有macOS工具链。

重新生成：在仓库根执行 clang -framework Foundation -framework CoreGraphics -framework ImageIO scripts/generate-pdf-organizer-fixture.m -o .ci/generate-pdf-image，再执行 .ci/generate-pdf-image tests/helpers/fixtures/organizer-red-blue.jp2。不同系统编码器可能输出不同字节，应复核颜色并更新实际证据。

高级PDF结构在pdfOrganizerAdvancedFixture.ts中自行构造：JPXDecode图像、原始CMYK像素、使用UniGB-UCS2-H的非嵌入CID字体，以及声明超像素的保护样例。CMap样例验证资源和可见字形，不是嵌入式CJK字体或任意字库保真保证；超像素样例用于拒绝路径，不用于证明完整图像有效。
