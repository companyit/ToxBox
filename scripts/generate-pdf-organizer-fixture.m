// 自行生成的32×32红蓝测试图，不含第三方图片或用户内容。
#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>
int main(int argc,const char **argv){@autoreleasepool{
 if(argc!=2)return 2; unsigned char pixels[32*32*3];
 for(int y=0;y<32;y++)for(int x=0;x<32;x++){int p=(y*32+x)*3;pixels[p]=x<16?255:0;pixels[p+1]=0;pixels[p+2]=x<16?0:255;}
 CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();CGDataProviderRef provider=CGDataProviderCreateWithData(NULL,pixels,sizeof(pixels),NULL);
 CGImageRef image=CGImageCreate(32,32,8,24,32*3,space,(CGBitmapInfo)kCGImageAlphaNone,provider,NULL,false,kCGRenderingIntentDefault);
 NSURL *url=[NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]];CGImageDestinationRef dest=CGImageDestinationCreateWithURL((__bridge CFURLRef)url,CFSTR("public.jpeg-2000"),1,NULL);
 if(!dest)return 3;CGImageDestinationAddImage(dest,image,NULL);BOOL ok=CGImageDestinationFinalize(dest);CFRelease(dest);CGImageRelease(image);CGDataProviderRelease(provider);CGColorSpaceRelease(space);return ok?0:4;
}}
