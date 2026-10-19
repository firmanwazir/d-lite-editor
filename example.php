<?php
/**
 * D-Lite Editor - Contoh Lengkap Implementasi PHP (Backend & Frontend)
 * 
 * Halaman ini mendemonstrasikan secara nyata dan interaktif:
 * 1. Formulir pengiriman artikel (POST) dengan D-Lite Editor
 * 2. Upload gambar & berkas langsung ke backend PHP (upload.php) via Drag & Drop, Paste, dan Toolbar
 * 3. Pemrosesan dan penyimpanan artikel di sisi server PHP
 * 4. Penampil galeri media berkas & gambar yang tersimpan di server
 * 5. Panduan kode lengkap (HTML, JS, dan PHP PDO Database)
 */

session_start();

// Inisialisasi token CSRF sederhana untuk keamanan
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$message = null;
$messageType = null;
$savedArticle = null;

/**
 * Sanitasi HTML di sisi server PHP (Defense-in-Depth)
 * Memastikan payload XSS yang dikirim langsung (bypass frontend) tetap dinetralisir
 */
function sanitizeEditorHtml($html) {
    if (empty($html)) return '';
    // Hapus tag berisiko tinggi
    $html = preg_replace('/<\s*(script|object|embed|applet|meta|link|style|form|base|template)[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $html);
    $html = preg_replace('/<\s*(script|object|embed|applet|meta|link|style|form|base|template|input|button)[^>]*\/?\s*>/is', '', $html);
    // Hapus inline event handlers (onload, onerror, dll)
    $html = preg_replace('/\s+on[a-z0-9_-]+\s*=\s*(["\'][^"\']*["\']|[^\s>]+)/i', '', $html);
    // Hapus protokol URI berbahaya pada href atau src (mendukung quoted maupun unquoted)
    $html = preg_replace('/(href|src)\s*=\s*(["\']?)\s*(javascript|vbscript|data:\s*text\/html)[^"\'\s>]*\2/i', '$1="#"', $html);
    return trim($html);
}

// Tangani pengiriman formulir artikel (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_article') {
    // 1. Verifikasi CSRF Token
    $postedToken = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
    if (!hash_equals($_SESSION['csrf_token'], $postedToken)) {
        $message = 'Validasi keamanan (CSRF Token) gagal. Silakan coba lagi.';
        $messageType = 'danger';
    } else {
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        $category = isset($_POST['category']) ? trim($_POST['category']) : 'Umum';
        $author = isset($_POST['author']) ? trim($_POST['author']) : 'Admin';
        $content = isset($_POST['content']) ? trim($_POST['content']) : '';

        if (empty($title)) {
            $message = 'Judul artikel wajib diisi!';
            $messageType = 'danger';
        } elseif (empty($content) || $content === '<p><br></p>') {
            $message = 'Konten artikel tidak boleh kosong!';
            $messageType = 'danger';
        } else {
            // Sanitasi server-side
            $sanitizedContent = sanitizeEditorHtml($content);

            // Simulasi Penyimpanan ke Database (atau variabel untuk ditampilkan)
            $savedArticle = [
                'id' => rand(100, 999),
                'title' => htmlspecialchars($title, ENT_QUOTES, 'UTF-8'),
                'category' => htmlspecialchars($category, ENT_QUOTES, 'UTF-8'),
                'author' => htmlspecialchars($author, ENT_QUOTES, 'UTF-8'),
                'date' => date('d F Y, H:i') . ' WIB',
                'raw_content' => $sanitizedContent
            ];

            $message = 'Artikel berhasil disimpan dan dipublikasikan ke server!';
            $messageType = 'success';
        }
    }
}

// Fungsi bantu membaca daftar berkas di direktori uploads
function getUploadedMediaList() {
    $baseDir = __DIR__ . '/uploads';
    $files = [];
    if (!is_dir($baseDir)) return $files;

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? 'https://' : 'http://';
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-zA-Z0-9\.\-:]/', '', $_SERVER['HTTP_HOST']) : 'localhost';
    if (empty($host)) {
        $host = 'localhost';
    }
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    $scriptDir = ($scriptDir === '/' || $scriptDir === '\\') ? '' : str_replace('\\', '/', $scriptDir);

    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getFilename() !== '.htaccess') {
            $ext = strtolower($file->getExtension());
            $isImage = in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
            $relPath = str_replace(str_replace('\\', '/', $baseDir), '', str_replace('\\', '/', $file->getPathname()));
            $relPath = ltrim($relPath, '/');

            $files[] = [
                'name' => $file->getFilename(),
                'size' => $file->getSize(),
                'size_formatted' => round($file->getSize() / 1024, 1) . ' KB',
                'ext' => $ext,
                'is_image' => $isImage,
                'time' => $file->getMTime(),
                'date_formatted' => date('d M Y H:i', $file->getMTime()),
                'url' => $protocol . $host . $scriptDir . '/uploads/' . $relPath
            ];
        }
    }

    // Urutkan dari yang paling baru
    usort($files, function($a, $b) {
        return $b['time'] - $a['time'];
    });

    return $files;
}

$mediaFiles = getUploadedMediaList();
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contoh Lengkap Implementasi PHP & Upload - D-Lite Editor</title>
  
  <!-- Font Google & Stylesheets -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- CSS Utama D-Lite Editor -->
  <link rel="stylesheet" href="dlite-editor.css">

  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --primary-light: rgba(79, 70, 229, 0.1);
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
    }

    [data-theme="dark"] {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --primary-light: rgba(99, 102, 241, 0.15);
      --bg: #0b0f19;
      --card-bg: #151d2f;
      --border: #243049;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 32px 16px 80px 16px;
      transition: background-color 200ms ease, color 200ms ease;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header Nav */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text);
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #4f46e5, #9333ea);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    .brand-text h1 {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
    }

    .brand-text p {
      font-size: 13px;
      color: var(--text-muted);
    }

    .nav-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn-primary {
      background: var(--primary);
      color: #fff !important;
      border-color: var(--primary);
    }

    .btn-primary:hover {
      background: var(--primary-hover);
    }

    /* Alert Banner */
    .alert {
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: var(--shadow-sm);
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--success);
    }

    .alert-danger {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: var(--danger);
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Form Grid */
    .form-group {
      margin-bottom: 18px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      font-family: inherit;
      color: var(--text);
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: none;
      transition: border-color 150ms ease;
    }

    .form-control:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    /* Upload Live Status Badge */
    .backend-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: var(--success);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* Server Media Gallery */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }

    .media-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .media-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary);
    }

    .media-thumb-wrap {
      width: 100%;
      height: 120px;
      border-radius: 6px;
      background: rgba(0,0,0,0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .media-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-file-icon {
      font-size: 32px;
      color: var(--primary);
    }

    .media-info {
      flex: 1;
    }

    .media-name {
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .media-meta {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    .media-actions {
      display: flex;
      gap: 6px;
    }

    .btn-xs {
      padding: 5px 8px;
      font-size: 11px;
      border-radius: 6px;
    }

    /* Saved Article Preview */
    .article-preview-header {
      margin-bottom: 16px;
    }

    .article-preview-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .article-preview-meta {
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .article-preview-body {
      line-height: 1.8;
      font-size: 15px;
    }

    .article-preview-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }

    /* Tabs & Code Snippet Box */
    .tab-nav {
      display: flex;
      border-bottom: 1px solid var(--border);
      gap: 8px;
      margin-bottom: 16px;
    }

    .tab-btn {
      padding: 10px 16px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
    }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    pre.code-block {
      background: #090d16;
      border: 1px solid #243049;
      border-radius: 10px;
      padding: 16px;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.6;
      overflow-x: auto;
    }
  </style>
</head>
<body>

<div class="container">

  <!-- Top Navigation & Branding -->
  <header class="header-bar">
    <a href="example.php" class="brand">
      <div class="brand-icon">D</div>
      <div class="brand-text">
        <h1>D-Lite Editor — Implementasi PHP Asli</h1>
        <p>Formulir Simpan Artikel & Upload Berkas/Gambar ke Server (upload.php)</p>
      </div>
    </a>
    <div class="nav-actions">
      <span class="backend-badge">
        <span class="pulse-dot"></span>
        Backend: upload.php
      </span>
      <a href="upload.php" class="btn">⚙️ Cek upload.php</a>
      <a href="index.html" class="btn">🎨 Playground UI</a>
      <button type="button" id="btn-theme-toggle" class="btn">🌓 Tema</button>
    </div>
  </header>

  <!-- Alert Message (if any) -->
  <?php if ($message): ?>
    <div class="alert alert-<?php echo $messageType; ?>">
      <span><?php echo $messageType === 'success' ? '✓' : '⚠️'; ?></span>
      <div><?php echo $message; ?></div>
    </div>
  <?php endif; ?>

  <!-- Saved Article Live Preview Box (Tampil jika baru saja submit) -->
  <?php if ($savedArticle): ?>
    <div class="card" style="border: 2px solid var(--success);">
      <div class="card-header">
        <div class="card-title" style="color: var(--success);">
          🎉 Artikel Berhasil Disimpan di Sisi PHP! (Live Render)
        </div>
        <button class="btn btn-xs" onclick="document.getElementById('saved-article-box').scrollIntoView({behavior:'smooth'})">Lihat ke bawah ↓</button>
      </div>

      <div id="saved-article-box">
        <div class="article-preview-header">
          <h2 class="article-preview-title"><?php echo $savedArticle['title']; ?></h2>
          <div class="article-preview-meta">
            <span>👤 Penulis: <strong><?php echo $savedArticle['author']; ?></strong></span>
            <span>📁 Kategori: <strong><?php echo $savedArticle['category']; ?></strong></span>
            <span>📅 Tanggal: <strong><?php echo $savedArticle['date']; ?></strong></span>
            <span>🆔 ID Artikel: <strong>#<?php echo $savedArticle['id']; ?></strong></span>
          </div>
        </div>

        <div class="article-preview-body">
          <!-- Merender langsung HTML yang disimpan dari D-Lite Editor -->
          <?php echo $savedArticle['raw_content']; ?>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
          <details>
            <summary style="font-size: 13px; font-weight: 600; cursor: pointer; color: var(--primary);">
              🔍 Lihat Raw HTML yang diterima oleh $_POST['content']
            </summary>
            <pre class="code-block" style="margin-top: 10px;"><?php echo htmlspecialchars($savedArticle['raw_content']); ?></pre>
          </details>
        </div>
      </div>
    </div>
  <?php endif; ?>

  <!-- Real Article Creation Form with D-Lite Editor -->
  <form id="article-form" method="POST" action="example.php">
    <input type="hidden" name="action" value="save_article">
    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

    <div class="card">
      <div class="card-header">
        <div class="card-title">
          ✍️ Formulir Tulis Artikel & Upload Media
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Drag & Drop berkas, tempel gambar screenshot (Ctrl+V), atau gunakan toolbar
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="article-title">Judul Artikel <span style="color:var(--danger)">*</span></label>
          <input type="text" id="article-title" name="title" class="form-control" placeholder="Contoh: Panduan Mengunggah Berkas di D-Lite Editor..." value="<?php echo isset($_POST['title']) ? htmlspecialchars($_POST['title']) : 'Mengenal Fitur Unggah Media Instan di D-Lite Editor'; ?>" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="article-category">Kategori</label>
          <select id="article-category" name="category" class="form-control">
            <option value="Teknologi">Teknologi</option>
            <option value="Tutorial">Tutorial</option>
            <option value="Pengumuman">Pengumuman</option>
            <option value="Dokumentasi">Dokumentasi</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="article-author">Penulis</label>
          <input type="text" id="article-author" name="author" class="form-control" value="Ahmad Saugi" placeholder="Nama Penulis">
        </div>
      </div>

      <!-- Target Textarea untuk sinkronisasi nilai ke PHP -->
      <div class="form-group">
        <label class="form-label">
          Isi Konten Artikel
          <small style="color: var(--text-muted); font-weight: normal;">(Otomatis disinkronkan ke $_POST['content'] saat submit)</small>
        </label>
        
        <!-- Textarea Tersembunyi untuk Menerima Nilai Form Submit POST -->
        <textarea id="article-content" name="content" style="display:none;"></textarea>

        <!-- Wadah Kontainer D-Lite Editor -->
        <div id="editor-container"></div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 13px; color: var(--text-muted);">
          🔒 Upload diarahkan ke <code>upload.php</code> (Batas 15MB, Whitelist Format, Proteksi .htaccess)
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn" id="btn-reset-content">Kosongkan Editor</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-article">
            💾 Simpan & Publikasikan Artikel (POST)
          </button>
        </div>
      </div>
    </div>
  </form>

  <!-- Interactive Server Media Gallery Browser -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">
        📁 Galeri Berkas & Gambar Server (Direktori uploads/)
      </div>
      <div style="font-size: 12px; color: var(--text-muted);">
        Total: <?php echo count($mediaFiles); ?> berkas tersimpan di server
      </div>
    </div>

    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
      Berkas di bawah ini adalah file yang benar-benar telah diunggah ke server Anda. Anda dapat mengklik tombol <strong>"Sisipkan ke Editor"</strong> untuk memasukkannya langsung ke dalam posisi kursor aktif!
    </p>

    <?php if (empty($mediaFiles)): ?>
      <div style="text-align: center; padding: 36px 20px; background: var(--bg); border: 1px dashed var(--border); border-radius: 10px;">
        <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
        <p style="font-size: 14px; font-weight: 600;">Belum ada berkas di folder uploads/</p>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          Coba tarik gambar atau berkas PDF/DOCX ke dalam editor di atas, atau gunakan tombol upload di toolbar untuk mulai mengunggah.
        </p>
      </div>
    <?php else: ?>
      <div class="gallery-grid">
        <?php foreach ($mediaFiles as $media): ?>
          <div class="media-card">
            <div class="media-thumb-wrap">
              <?php if ($media['is_image']): ?>
                <img src="<?php echo htmlspecialchars($media['url']); ?>" alt="<?php echo htmlspecialchars($media['name']); ?>" class="media-thumb" loading="lazy">
              <?php else: ?>
                <div class="media-file-icon">📄</div>
              <?php endif; ?>
            </div>
            
            <div class="media-info">
              <div class="media-name" title="<?php echo htmlspecialchars($media['name']); ?>">
                <?php echo htmlspecialchars($media['name']); ?>
              </div>
              <div class="media-meta">
                <span><?php echo strtoupper($media['ext']); ?> • <?php echo $media['size_formatted']; ?></span>
                <span><?php echo $media['date_formatted']; ?></span>
              </div>
            </div>

            <div class="media-actions">
              <button type="button" class="btn btn-xs btn-primary btn-insert-media" 
                      data-url="<?php echo htmlspecialchars($media['url']); ?>" 
                      data-name="<?php echo htmlspecialchars($media['name']); ?>" 
                      data-size="<?php echo $media['size']; ?>" 
                      data-is-image="<?php echo $media['is_image'] ? '1' : '0'; ?>"
                      style="flex: 1;">
                📥 Sisipkan
              </button>
              <button type="button" class="btn btn-xs btn-copy-link" data-url="<?php echo htmlspecialchars($media['url']); ?>" title="Salin URL">
                🔗 Salin
              </button>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

  <!-- Developer Documentation & Code Implementation Tabs -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">
        💻 Panduan Integrasi Kode Pengembang
      </div>
      <div style="font-size: 12px; color: var(--text-muted);">
        Salin kode siap pakai untuk proyek Anda
      </div>
    </div>

    <div class="tab-nav">
      <button type="button" class="tab-btn active" onclick="switchDocTab('tab-frontend')">1. Frontend HTML & JS</button>
      <button type="button" class="tab-btn" onclick="switchDocTab('tab-php-backend')">2. Simpan ke Database (PHP PDO)</button>
      <button type="button" class="tab-btn" onclick="switchDocTab('tab-upload-sec')">3. Keamanan upload.php</button>
    </div>

    <!-- Tab 1: Frontend -->
    <div id="tab-frontend" class="tab-content active">
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">
        Berikut cara menginisialisasi D-Lite Editor dengan formulir standar HTML agar otomatis mensinkronkan nilainya ke <code>&lt;textarea&gt;</code> sebelum form disubmit:
      </p>
      <pre class="code-block">&lt;!-- 1. Sertakan CSS D-Lite Editor --&gt;
&lt;link rel="stylesheet" href="dlite-editor.css"&gt;

&lt;!-- 2. Buat Form HTML --&gt;
&lt;form id="myForm" method="POST" action="simpan-artikel.php"&gt;
  &lt;input type="text" name="judul" placeholder="Judul Artikel" required&gt;

  &lt;!-- Textarea tersembunyi untuk menampung isi HTML --&gt;
  &lt;textarea id="konten" name="konten" style="display:none;"&gt;&lt;/textarea&gt;

  &lt;!-- Wadah Kontainer Editor --&gt;
  &lt;div id="my-editor"&gt;&lt;/div&gt;

  &lt;button type="submit"&gt;Simpan Artikel&lt;/button&gt;
&lt;/form&gt;

&lt;!-- 3. Inisialisasi Script JS --&gt;
&lt;script type="module"&gt;
  import { DLiteEditor } from './dlite-editor.js';

  const editor = new DLiteEditor({
    selector: '#my-editor',
    height: '450px',
    placeholder: 'Tuliskan artikel Anda di sini...',
    upload: {
      endpoint: 'upload.php', // Arahkan ke upload.php
      fieldName: 'file',
      maxFileSize: 15 * 1024 * 1024 // 15MB
    }
  });

  // Sinkronkan isi editor ke textarea saat form akan disubmit
  document.getElementById('myForm').addEventListener('submit', (e) =&gt; {
    document.getElementById('konten').value = editor.getContent();
  });
&lt;/script&gt;</pre>
    </div>

    <!-- Tab 2: PHP Database Storage -->
    <div id="tab-php-backend" class="tab-content">
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">
        Skrip contoh backend PHP (misal: <code>simpan-artikel.php</code>) untuk memvalidasi dan menyimpan artikel ke database MySQL menggunakan PDO Prepared Statement:
      </p>
      <pre class="code-block">&lt;?php
// simpan-artikel.php
require_once 'koneksi.php'; // Hubungkan ke Database MySQL

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $judul = trim($_POST['judul'] ?? '');
    $konten = trim($_POST['konten'] ?? '');

    // Validasi Sederhana
    if (empty($judul) || empty($konten)) {
        die('Judul dan konten tidak boleh kosong!');
    }

    // Catatan: D-Lite Editor sudah menyaring XSS di client-side melalui Sanitizer.js.
    // Jika ingin proteksi ekstra di server-side, Anda dapat menggunakan library seperti HTMLPurifier.

    // Simpan ke database dengan PDO Prepared Statements (Aman dari SQL Injection)
    $stmt = $pdo-&gt;prepare("INSERT INTO artikel (judul, konten, created_at) VALUES (:judul, :konten, NOW())");
    $stmt-&gt;execute([
        ':judul'  =&gt; $judul,
        ':konten' =&gt; $konten
    ]);

    header('Location: artikel-detail.php?id=' . $pdo-&gt;lastInsertId());
    exit;
}</pre>
    </div>

    <!-- Tab 3: Upload Security -->
    <div id="tab-upload-sec" class="tab-content">
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">
        Arsitektur keamanan bawaan yang diterapkan pada file <code>upload.php</code>:
      </p>
      <pre class="code-block">Fitur Keamanan Terintegrasi di upload.php:
=========================================
1. Whitelist Ekstensi Ketat:
   Hanya menerima ekstensi aman (jpg, png, gif, webp, svg, pdf, doc, docx, xls, xlsx, zip, txt).
   Ekstensi seperti .php, .exe, .sh, .py otomatis ditolak.

2. Proteksi Double Extension Attack:
   Memeriksa pola berkas ganda berbahaya seperti: "shell.php.jpg" atau "trojan.phtml.png"
   menggunakan regex: /\.(php[0-9]?|phtml|phar|exe|sh|bat)(\.|$)/i

3. Validasi Real MIME Type (finfo):
   Mengecek header binary berkas secara langsung di server menggunakan modul PHP Fileinfo
   sehingga file skrip PHP yang diubah ekstensinya menjadi .jpg akan tetap terdeteksi dan diblokir.

4. Penamaan Berkas Acak (Anti-Collision & Path Traversal):
   Nama berkas di-generate ulang dengan format: Ymd_His_{random_bytes}.ext
   sehingga tidak bisa dilakukan exploit directory traversal (../../).

5. Proteksi Otomatis .htaccess:
   Secara otomatis membuat file .htaccess di dalam direktori uploads/ berisi:
   - "php_flag engine off"
   - "Options -ExecCGI"
   sehingga Apache tidak akan pernah mengeksekusi skrip apapun di dalam folder uploads/.</pre>
    </div>
  </div>

</div>

<!-- Inisialisasi Skrip D-Lite Editor -->
<script type="module">
  import { DLiteEditor } from './dlite-editor.js';
  import { toast } from './src/ui/Toast.js';
  import { modal } from './src/ui/Modal.js';

  // Konten sampel awal
  const initialContent = `
    <h2>Panduan Menulis & Mengunggah Berkas di D-Lite Editor</h2>
    <p>Halo! Ini adalah contoh integrasi langsung D-Lite Editor dengan backend PHP (<code>upload.php</code>). Semua gambar dan berkas yang Anda tambahkan ke dokumen ini akan langsung dikirim dan disimpan ke server secara real-time.</p>
    
    <h3>Fitur Unggulan Pengunggahan Media:</h3>
    <ul class="dlite-checklist">
      <li class="dlite-checklist-item is-checked" data-checked="true"><input type="checkbox" checked> Tarik dan lepas (Drag & Drop) berkas langsung ke dalam editor</li>
      <li class="dlite-checklist-item is-checked" data-checked="true"><input type="checkbox" checked> Ambil screenshot layar lalu tempelkan langsung (Ctrl+V)</li>
      <li class="dlite-checklist-item is-checked" data-checked="true"><input type="checkbox" checked> Progress bar animasi saat proses upload berlangsung</li>
      <li class="dlite-checklist-item is-checked" data-checked="true"><input type="checkbox" checked> Kartu cerdas (smart card) untuk berkas dokumen non-gambar (PDF, DOCX, ZIP)</li>
    </ul>

    <p>Silakan coba klik tombol <strong>"Simpan & Publikasikan Artikel"</strong> di bawah untuk melihat bagaimana PHP memproses formulir ini!</p>
  `;

  // Inisialisasi Editor
  const editor = new DLiteEditor({
    selector: '#editor-container',
    height: '460px',
    placeholder: 'Mulai menulis konten artikel Anda di sini...',
    initialContent: initialContent,
    upload: {
      endpoint: 'upload.php', // Arahkan langsung ke backend upload.php
      fieldName: 'file',
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      allowedFileTypes: ['application/pdf', 'application/zip', '.docx', '.xlsx', '.txt']
    },
    onChange: (html) => {
      // Perbarui textarea secara langsung saat ada perubahan teks
      const textarea = document.getElementById('article-content');
      if (textarea) {
        textarea.value = html;
      }
    }
  });

  // Sinkronkan sebelum form di-submit
  const form = document.getElementById('article-form');
  form.addEventListener('submit', (e) => {
    const content = editor.getContent();
    document.getElementById('article-content').value = content;
    
    if (!content || content.trim() === '' || content === '<p><br></p>') {
      e.preventDefault();
      toast.warning('Konten artikel masih kosong. Tuliskan sesuatu sebelum menyimpan!');
      return false;
    }
  });

  // Tombol Reset Editor
  document.getElementById('btn-reset-content').addEventListener('click', async () => {
    const confirmed = await modal.confirm({
      title: 'Kosongkan Dokumen?',
      message: 'Apakah Anda yakin ingin menghapus seluruh isi editor? Tindakan ini dapat dibatalkan melalui Ctrl+Z.',
      confirmText: 'Ya, Kosongkan',
      cancelText: 'Batal'
    });
    if (confirmed) {
      editor.clear();
      toast.info('Isi editor telah dikosongkan.');
    }
  });

  // Tombol Sisipkan Media dari Galeri Server ke Editor
  document.querySelectorAll('.btn-insert-media').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      const name = btn.getAttribute('data-name');
      const size = parseInt(btn.getAttribute('data-size') || '0', 10);
      const isImage = btn.getAttribute('data-is-image') === '1';

      if (isImage) {
        // Sisipkan Gambar dengan Figure dan Keterangan
        const figure = document.createElement('figure');
        figure.className = 'dlite-media-figure dlite-align-center';
        
        const img = document.createElement('img');
        img.src = url;
        img.alt = name;
        img.className = 'dlite-media-image';

        const caption = document.createElement('figcaption');
        caption.className = 'dlite-media-caption';
        caption.setAttribute('data-placeholder', 'Keterangan gambar...');

        figure.appendChild(img);
        figure.appendChild(caption);

        editor.selection.insertBlockNode(figure);
        toast.success(`Gambar "${name}" berhasil disisipkan ke editor!`);
      } else {
        // Sisipkan Dokumen sebagai Smart File Card
        const card = editor.plugins.file.createFileCard({
          url: url,
          name: name,
          size: size
        });

        if (card) {
          editor.selection.insertBlockNode(card);
          toast.success(`Berkas "${name}" berhasil disisipkan ke editor!`);
        }
      }

      // Scroll halus kembali ke editor
      document.getElementById('editor-container').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Tombol Salin URL Media
  document.querySelectorAll('.btn-copy-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      navigator.clipboard.writeText(url).then(() => {
        toast.success('URL berkas disalin ke clipboard!');
      });
    });
  });

  // Toggle Tema Gelap / Terang Halaman
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    editor.toggleTheme();
  });
</script>

<script>
  // Tab Switcher untuk Dokumentasi
  function switchDocTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');
  }
</script>

</body>
</html>
