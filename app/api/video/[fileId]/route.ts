import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const bucket = await getBucket();
    if (!ObjectId.isValid(params.fileId)) { return new NextResponse(null, { status: 400 }); }
    const fileId = new ObjectId(params.fileId);
    const downloadStream = bucket.openDownloadStream(fileId);
    return new NextResponse(downloadStream as any, {
      headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' },
    });
  } catch (error) { return new NextResponse(null, { status: 404 }); }
}
