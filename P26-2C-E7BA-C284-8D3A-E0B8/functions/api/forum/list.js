/**
 * GET /api/forum/list?chapter=1
 * Retorna os posts do capítulo permitido.
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const cookieHeader =
      request.headers.get("Cookie") || "";

    const sessionMatch =
      cookieHeader.match(/discord_session=([^;]+)/);

    if (!sessionMatch) {
      return Response.json(
        {
          ok: false,
          error: "not_authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const sessionUser = JSON.parse(
      decodeURIComponent(
        atob(sessionMatch[1])
      )
    );

    const userId =
      sessionUser.userId ||
      sessionUser.user_id;

    const url = new URL(request.url);

    const chapter =
      Number(
        url.searchParams.get("chapter")
      );

    if (
      !Number.isInteger(chapter) ||
      chapter < 1
    ) {
      return Response.json(
        {
          ok: false,
          error: "invalid_chapter",
        },
        {
          status: 400,
        }
      );
    }

    const activeBook =
      await env.DB.prepare(`
        SELECT id
        FROM books
        WHERE active = 1
        LIMIT 1
      `).first();

    if (!activeBook) {
      return Response.json(
        {
          ok: false,
          error: "no_active_book",
        },
        {
          status: 404,
        }
      );
    }

    const progress =
      await env.DB.prepare(`
        SELECT current_chapter
        FROM reading_progress
        WHERE user_id = ?
          AND book_id = ?
      `)
        .bind(
          userId,
          activeBook.id
        )
        .first();

    if (!progress) {
      return Response.json(
        {
          ok: false,
          error: "progress_not_found",
        },
        {
          status: 404,
        }
      );
    }

    if (
      progress.current_chapter <
      chapter
    ) {
      return Response.json(
        {
          ok: false,
          error: "spoiler_blocked",
          currentChapter:
            progress.current_chapter,
        },
        {
          status: 403,
        }
      );
    }

    const posts =
      await env.DB.prepare(`
        SELECT
          id,
          username,
          content,
          created_at
        FROM forum_posts
        WHERE book_id = ?
          AND chapter = ?
        ORDER BY created_at ASC
      `)
        .bind(
          activeBook.id,
          chapter
        )
        .all();

    return Response.json({
      ok: true,
      chapter,
      posts:
        posts.results || [],
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        ok: false,
        error: "server_error",
      },
      {
        status: 500,
      }
    );
  }
}