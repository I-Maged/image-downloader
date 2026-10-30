import { NextResponse } from "next/server";
import { Readable, Writable } from "node:stream";
import { ZipArchive } from "archiver";
import { resolveMasterAsset } from "@/lib/image-resolver";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ZIP_BATCH_SIZE = 3;

interface DownloadItem {
  id: string;
  sourceUrl: string;
  detailUrl?: string;
  filename?: string;
  pageUrl?: string;
}

function sanitizeFilename(name: string | undefined, fallbackUrl: string): string {
  const raw = name?.trim() || fallbackUrl;
  const base = raw.split(/[?#]/)[0].split("/").pop() ?? "image";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.length > 0 ? safe : "image";
}

function uniqueFilename(candidate: string, used: Set<string>): string {
  const lower = candidate.toLowerCase();
  if (!used.has(lower)) {
    used.add(lower);
    return candidate;
  }

  const dotIndex = candidate.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex > candidate.lastIndexOf("/");
  const stem = hasExtension ? candidate.slice(0, dotIndex) : candidate;
  const extension = hasExtension ? candidate.slice(dotIndex) : "";

  let counter = 2;
  let next = `${stem} (${counter})${extension}`;
  while (used.has(next.toLowerCase())) {
    counter += 1;
    next = `${stem} (${counter})${extension}`;
  }
  used.add(next.toLowerCase());
  return next;
}

async function resolveFinalUrl(item: DownloadItem): Promise<string> {
  if (item.detailUrl) {
    const master = await resolveMasterAsset(item.detailUrl);
    return master ?? item.sourceUrl;
  }
  return item.sourceUrl;
}

function refererFor(item: DownloadItem, finalUrl: string): string {
  if (item.pageUrl) return item.pageUrl;

  try {
    const origin = new URL(finalUrl).origin;
    return `${origin}/`;
  } catch {
    return item.sourceUrl;
  }
}

export async function POST(request: Request) {
  let payload: { items?: DownloadItem[] } = {};

  try {
    payload = (await request.json()) as { items?: DownloadItem[] };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const items = payload?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ success: false, error: "An 'items' array is required" }, { status: 400 });
  }

  try {
    // Single selection: stream the original asset directly to the client.
    if (items.length === 1) {
      const item = items[0];
      const finalUrl = await resolveFinalUrl(item);

      const response = await fetch(finalUrl, {
        headers: { Referer: refererFor(item, finalUrl), "User-Agent": USER_AGENT },
        redirect: "follow",
      });

      if (!response.ok) {
        return NextResponse.json({ success: false, error: `Failed to fetch image (${response.status})` }, { status: 502 });
      }

      if (!response.body) {
        return NextResponse.json({ success: false, error: "Empty response body" }, { status: 502 });
      }

      const filename = sanitizeFilename(item.filename, finalUrl);

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Multi selection: stream a ZIP archive directly to the client.
    const usedNames = new Set<string>();
    const zipFilename = `images-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const sink = new Writable({
          write(chunk, _encoding, callback) {
            controller.enqueue(new Uint8Array(chunk as Buffer));
            callback();
          },
          final(callback) {
            controller.close();
            callback();
          },
          destroy(error) {
            if (error) controller.error(error);
          },
        });

        const archive = new ZipArchive({ zlib: { level: 6 } });
        archive.on("error", (error) => sink.destroy(error));
        archive.pipe(sink);

        (async () => {
          try {
            for (let i = 0; i < items.length; i += ZIP_BATCH_SIZE) {
              const batch = items.slice(i, i + ZIP_BATCH_SIZE);

              for (const item of batch) {
                const finalUrl = await resolveFinalUrl(item);
                const response = await fetch(finalUrl, {
                  headers: { Referer: refererFor(item, finalUrl), "User-Agent": USER_AGENT },
                  redirect: "follow",
                });

                if (!response.ok || !response.body) continue;

                const entryName = uniqueFilename(
                  sanitizeFilename(item.filename, finalUrl),
                  usedNames,
                );
                archive.append(Readable.fromWeb(response.body as never), { name: entryName });
              }
            }

            await archive.finalize();
          } catch (error) {
            sink.destroy(error instanceof Error ? error : new Error("Failed to create download archive"));
          }
        })();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create download archive";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}