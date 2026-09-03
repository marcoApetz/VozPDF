package com.marcoapetz.vozpdf;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Receives files shared into VozPDF from other apps (Android "Share" sheet)
 * and hands the bytes to JS as base64, since Capacitor's WebView can't read
 * content:// URIs directly. Fires for both a cold start from a share action
 * and a share received while the app is already running, via Capacitor's
 * built-in handleOnNewIntent plugin callback.
 */
@CapacitorPlugin(name = "ShareIntent")
public class ShareIntentPlugin extends Plugin {

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) {
            return;
        }
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) {
            return;
        }

        JSObject result = readSharedFile(uri, intent.getType());
        if (result != null) {
            // retainUntilConsumed=true queues the event until the JS side subscribes,
            // which covers the cold-start case where the WebView hasn't loaded yet.
            notifyListeners("shareReceived", result, true);
        }

        // Avoid re-processing this same intent on activity recreation (e.g. rotation).
        intent.setAction(null);
    }

    private JSObject readSharedFile(Uri uri, String mimeType) {
        ContentResolver resolver = getContext().getContentResolver();
        String fileName = queryFileName(resolver, uri);

        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) return null;

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int bytesRead;
            while ((bytesRead = input.read(chunk)) != -1) {
                buffer.write(chunk, 0, bytesRead);
            }

            JSObject result = new JSObject();
            result.put("fileName", fileName != null ? fileName : "documento");
            result.put("mimeType", mimeType != null ? mimeType : "application/octet-stream");
            result.put("base64Data", Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP));
            return result;
        } catch (IOException e) {
            Logger.error("ShareIntent", "Falha ao ler arquivo compartilhado", e);
            return null;
        }
    }

    private String queryFileName(ContentResolver resolver, Uri uri) {
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) {
                        return cursor.getString(idx);
                    }
                }
            } catch (Exception ignored) {
                // Fall through to path-based name below.
            }
        }
        String path = uri.getPath();
        if (path != null) {
            int cut = path.lastIndexOf('/');
            if (cut != -1) return path.substring(cut + 1);
        }
        return null;
    }
}
