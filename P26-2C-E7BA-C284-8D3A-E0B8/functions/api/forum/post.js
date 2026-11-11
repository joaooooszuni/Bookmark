/**
 * POST /api/forum/post
 * Cria uma mensagem no fórum.
 */

export async function onRequestPost(context) {
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

    const username =
      sessionUser.username ||
      "Leitor";

    const body =
      await request.json().catch(() => ({}));

    const chapter =
      Number(body.chapter);

    const content =
      String(body.content || "").trim();

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

    if (!content) {
      return Response.json(
        {
          ok: false,
          error: "empty_content",
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

    await env.DB.prepare(`
      INSERT INTO forum_posts
      (
        user_id,
        username,
        book_id,
        chapter,
        content
      )
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        userId,
        username,
        activeBook.id,
        chapter,
        content
      )
      .run();

    return Response.json({
      ok: true,
      message:
        "Mensagem publicada."
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