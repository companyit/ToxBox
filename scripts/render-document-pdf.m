#import <AppKit/AppKit.h>
#import <PDFKit/PDFKit.h>
int main(int argc, const char **argv) {
  @autoreleasepool {
    if (argc != 3) return 2;
    PDFDocument *pdf = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]]]];
    if (!pdf) return 3;
    for (NSUInteger i=0; i<pdf.pageCount; i++) {
      PDFPage *page = [pdf pageAtIndex:i];
      NSImage *thumbnail = [page thumbnailOfSize:NSMakeSize(800,800) forBox:kPDFDisplayBoxMediaBox];
      NSImage *image = [[NSImage alloc] initWithSize:thumbnail.size];
      [image lockFocus];
      [[NSColor whiteColor] setFill]; NSRectFill(NSMakeRect(0,0,image.size.width,image.size.height));
      [thumbnail drawAtPoint:NSZeroPoint fromRect:NSZeroRect operation:NSCompositingOperationSourceOver fraction:1];
      [image unlockFocus];
      NSBitmapImageRep *rep = [NSBitmapImageRep imageRepWithData:[image TIFFRepresentation]];
      NSString *out = [NSString stringWithFormat:@"%s-%lu.png",argv[2],(unsigned long)i+1];
      if (![[rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}] writeToFile:out atomically:YES]) return 4;
    }
    printf("Rendered %lu pages\n",(unsigned long)pdf.pageCount);
  }
  return 0;
}
