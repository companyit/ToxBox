#import <Foundation/Foundation.h>
#import <PDFKit/PDFKit.h>
int main(int argc,const char **argv){ @autoreleasepool {
 if(argc!=2)return 2;
 PDFDocument *doc=[[PDFDocument alloc]initWithURL:[NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]]];
 if(!doc || !doc.pageCount)return 3;
 NSMutableArray *pages=[NSMutableArray array];
 for(NSUInteger i=0;i<doc.pageCount;i++){PDFPage *p=[doc pageAtIndex:i];NSRect r=[p boundsForBox:kPDFDisplayBoxMediaBox];[pages addObject:@{@"text":p.string?:@"",@"rotation":@(p.rotation),@"width":@(r.size.width),@"height":@(r.size.height)}];}
 NSData *json=[NSJSONSerialization dataWithJSONObject:pages options:0 error:nil];fwrite(json.bytes,1,json.length,stdout);
 }return 0;}
