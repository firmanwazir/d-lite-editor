<?php
/**
 * D-Lite Editor - Backend Upload Handler (PHP)
 * Skrip pengunggah berkas & gambar yang aman, terstandarisasi, dan siap produksi.
 * 
 * Fitur Keamanan:
 * 1. Validasi Whitelist Ekstensi Berkas (Mencegah upload .php, .exe, .sh, dll.)
 * 2. Deteksi MIME Type Nyata menggunakan finfo (bukan hanya percaya nama file)
 * 3. Sanitasi Nama Berkas & Penamaan Acak Unik (Mencegah path traversal & RCE)
 * 4. Pembuatan subfolder otomatis berbasis tahun/bulan (uploads/YYYY/MM/)
 * 5. Proteksi .htaccess otomatis di folder uploads untuk menonaktifkan eksekusi PHP
 * 6. Format respon JSON standar yang kompatibel langsung dengan D-Lite Editor
 */

// 1. Header CORS & JSON Response
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');

// Tangani Pre-flight Request CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Jika diakses langsung via browser (GET), tampilkan halaman diagnostik & panduan pengembang
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Jika meminta JSON API
    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        echo json_encode([
            'status' => 'online',
            'service' => 'D-Lite Editor PHP Upload Endpoint',
            'max_file_size' => '15MB',
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'txt']
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // Tampilkan diagnostik HTML yang ramah pengembang
    header('Content-Type: text/html; charset=UTF-8');
    $uploadDir = __DIR__ . '/uploads';
    $isWritable = is_writable($uploadDir) || (!file_exists($uploadDir) && is_writable(__DIR__));
    $phpVersion = PHP_VERSION;
    $maxUpload = ini_get('upload_max_filesize');
    $maxPost = ini_get('post_max_size');
    ?>
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>D-Lite Editor - Backend Upload Handler</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #4f46e5;
                --primary-hover: #4338ca;
                --bg: #0f172a;
                --card-bg: #1e293b;
                --border: #334155;
                --text: #f8fafc;
                --text-muted: #94a3b8;
                --success: #10b981;
                --danger: #ef4444;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Plus Jakarta Sans', sans-serif;
                background-color: var(--bg);
                color: var(--text);
                min-height: 100vh;
                padding: 40px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .card {
                background: var(--card-bg);
                border: 1px solid var(--border);
                border-radius: 16px;
                max-width: 680px;
                width: 100%;
                padding: 36px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 600;
                background: rgba(16, 185, 129, 0.15);
                color: var(--success);
                border: 1px solid rgba(16, 185, 129, 0.3);
                margin-bottom: 16px;
            }
            .pulse {
                width: 8px;
                height: 8px;
                background-color: var(--success);
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.8); }
            }
            h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
            p.desc { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 24px;
            }
            .info-box {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 12px 16px;
            }
            .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px; }
            .info-value { font-size: 14px; font-weight: 600; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            .code-box {
                background: #090d16;
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 16px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                color: #38bdf8;
                overflow-x: auto;
                margin-bottom: 24px;
                line-height: 1.5;
            }
            .btn-group {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 18px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 8px;
                text-decoration: none;
                transition: all 150ms ease;
                cursor: pointer;
            }
            .btn-primary {
                background: var(--primary);
                color: #ffffff;
                border: none;
            }
            .btn-primary:hover {
                background: var(--primary-hover);
            }
            .btn-outline {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--text);
            }
            .btn-outline:hover {
                background: rgba(255,255,255,0.05);
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">
                <span class="pulse"></span>
                Endpoint Upload PHP Aktif & Siap Menerima File
            </div>
            <h1>D-Lite Editor - Backend Upload Handler</h1>
            <p class="desc">
                Skrip ini bertugas sebagai endpoint HTTP POST untuk menerima unggahan berkas & gambar dari D-Lite Editor melalui AJAX/Fetch. Dilengkapi proteksi anti-RCE, whitelist MIME-type ganda, dan proteksi <code>.htaccess</code> otomatis.
            </p>

            <div class="info-grid">
                <div class="info-box">
                    <div class="info-label">Versi PHP Server</div>
                    <div class="info-value"><?php echo htmlspecialchars($phpVersion); ?></div>
                </div>
                <div class="info-box">
                    <div class="info-label">Status Izin Folder Uploads</div>
                    <div class="info-value" style="color: <?php echo $isWritable ? 'var(--success)' : 'var(--danger)'; ?>">
                        <?php echo $isWritable ? '✓ Siap Tulis (Writable)' : '✗ Tidak Bisa Ditulis'; ?>
                    </div>
                </div>
                <div class="info-box">
                    <div class="info-label">Batas upload_max_filesize</div>
                    <div class="info-value"><?php echo htmlspecialchars($maxUpload); ?></div>
                </div>
                <div class="info-box">
                    <div class="info-label">Batas post_max_size</div>
                    <div class="info-value"><?php echo htmlspecialchars($maxPost); ?></div>
                </div>
            </div>

            <div class="code-box">// Inisialisasi Editor dengan endpoint ini:
const editor = new DLiteEditor({
  selector: '#my-editor',
  upload: {
    endpoint: 'upload.php', // Arahkan ke skrip ini
    fieldName: 'file',
    maxFileSize: 15 * 1024 * 1024 // 15MB
  }
});</div>

            <div class="btn-group">
                <a href="example.php" class="btn btn-primary">
                    🚀 Buka Contoh Implementasi Form PHP (example.php)
                </a>
                <a href="index.html" class="btn btn-outline">
                    🎨 Buka Demo Playground (index.html)
                </a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// 2. Konfigurasi Batas & Folder Upload
$maxFileSize = 15 * 1024 * 1024; // 15 Megabytes
$uploadBaseDir = __DIR__ . '/uploads';
$fieldName = 'file'; // Default field name dari D-Lite Editor

// Whitelist Ekstensi & MIME Type yang diizinkan
$allowedExtensions = [
    // Gambar
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'svg'  => 'image/svg+xml',
    // Dokumen / Berkas
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls'  => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt'  => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'zip'  => 'application/zip',
    'txt'  => 'text/plain'
];

// Daftar ekstensi terlarang ganda (Double-extension attacks)
$dangerousPatterns = '/\.(php[0-9]?|phtml|phar|exe|sh|bat|cgi|pl|py|jsp|asp|aspx)(\.|$)/i';

// 3. Validasi Keberadaan Berkas yang Diunggah
// Cek jika ukuran pengiriman melebihi post_max_size php.ini (PHP secara diam-diam mengosongkan $_FILES)
if (empty($_FILES) && empty($_POST) && isset($_SERVER['REQUEST_METHOD']) && strtolower($_SERVER['REQUEST_METHOD']) === 'post') {
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 0) {
        $postMax = ini_get('post_max_size');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Ukuran berkas melebihi batas konfigurasi post_max_size server ({$postMax})."
        ]);
        exit;
    }
}

if (!isset($_FILES[$fieldName]) || empty($_FILES[$fieldName]['name'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Tidak ada berkas yang diterima pada parameter "' . $fieldName . '".'
    ]);
    exit;
}

$uploadedFile = $_FILES[$fieldName];

// Periksa kode error bawaan PHP
if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE   => 'Ukuran berkas melebihi batas upload_max_filesize di php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'Ukuran berkas melebihi batas MAX_FILE_SIZE formulir.',
        UPLOAD_ERR_PARTIAL    => 'Berkas hanya terunggah sebagian. Silakan coba lagi.',
        UPLOAD_ERR_NO_FILE    => 'Tidak ada berkas yang dipilih.',
        UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary server tidak ditemukan.',
        UPLOAD_ERR_CANT_WRITE => 'Gagal menulis berkas ke penyimpanan server.',
        UPLOAD_ERR_EXTENSION  => 'Pengunggahan dihentikan oleh ekstensi PHP server.'
    ];

    $msg = isset($errorMessages[$uploadedFile['error']]) ? $errorMessages[$uploadedFile['error']] : 'Terjadi kegagalan upload (Kode: ' . $uploadedFile['error'] . ').';
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

// 4. Validasi Ukuran Berkas
if ($uploadedFile['size'] > $maxFileSize) {
    http_response_code(400);
    $maxMb = round($maxFileSize / (1024 * 1024));
    echo json_encode([
        'success' => false,
        'message' => "Ukuran berkas ({$uploadedFile['size']} bytes) melebihi batas maksimum {$maxMb}MB."
    ]);
    exit;
}

// 5. Validasi Nama dan Ekstensi
$originalName = basename($uploadedFile['name']);
// Hapus karakter null byte (\0) yang bisa memotong string
$originalName = str_replace(chr(0), '', $originalName);

// Cek double extension attack (misal: shell.php.jpg)
if (preg_match($dangerousPatterns, $originalName)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Ekstensi berkas tidak diizinkan demi keamanan server.'
    ]);
    exit;
}

$fileExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!array_key_exists($fileExt, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Format ekstensi berkas .{$fileExt} tidak diizinkan."
    ]);
    exit;
}

$isImage = in_array($fileExt, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);

// 6. Validasi MIME Type Asli & Integritas Berkas
if (function_exists('finfo_open') && $fileExt !== 'svg') {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $realMime = finfo_file($finfo, $uploadedFile['tmp_name']);
    finfo_close($finfo);

    $expectedMime = $allowedExtensions[$fileExt];
    
    // Khusus pengecekan gambar: pastikan mime valid
    if (strpos($expectedMime, 'image/') === 0 && strpos($realMime, 'image/') !== 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Berkas bukan gambar yang valid (Tipe MIME tidak cocok).'
        ]);
        exit;
    }
}

// Validasi struktur gambar raster menggunakan getimagesize
if ($isImage && $fileExt !== 'svg') {
    $imgSize = @getimagesize($uploadedFile['tmp_name']);
    if ($imgSize === false || $imgSize[0] <= 0 || $imgSize[1] <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Berkas gambar rusak atau tidak valid.'
        ]);
        exit;
    }
}

// Validasi Keamanan SVG: Anti-XSS & Anti-XXE
if ($fileExt === 'svg') {
    $svgContent = @file_get_contents($uploadedFile['tmp_name']);
    if ($svgContent === false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Gagal membaca berkas SVG.']);
        exit;
    }

    $dangerousSvgPatterns = [
        '/<\s*script/i',
        '/on[a-z]+\s*=/i',
        '/<\s*!\s*ENTITY/i',
        '/<\s*!\s*DOCTYPE/i',
        '/xlink\s*:\s*href\s*=\s*["\']\s*(javascript|data):/i',
        '/href\s*=\s*["\']\s*(javascript|data):/i'
    ];

    foreach ($dangerousSvgPatterns as $pattern) {
        if (preg_match($pattern, $svgContent)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Berkas SVG ditolak karena mengandung elemen atau skrip terlarang (Anti-XSS/XXE).'
            ]);
            exit;
        }
    }
}

// 7. Siapkan Direktori Penyimpanan Berbasis Tahun/Bulan
$subDir = date('Y') . '/' . date('m');
$targetDir = $uploadBaseDir . '/' . $subDir;

if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal membuat direktori penyimpanan di server.'
        ]);
        exit;
    }
}

// Amankan folder uploads dengan .htaccess (Blokir eksekusi skrip untuk mod_php & FastCGI / PHP-FPM)
$htaccessFile = $uploadBaseDir . '/.htaccess';
$htaccessContent = "# D-Lite Editor Security: Matikan eksekusi skrip di direktori uploads\n"
                 . "<IfModule mod_php.c>\n"
                 . "    php_flag engine off\n"
                 . "</IfModule>\n"
                 . "<IfModule mod_php7.c>\n"
                 . "    php_flag engine off\n"
                 . "</IfModule>\n"
                 . "<IfModule mod_php8.c>\n"
                 . "    php_flag engine off\n"
                 . "</IfModule>\n"
                 . "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar\n"
                 . "Options -ExecCGI\n"
                 . "# Blokir eksekusi skrip untuk Apache FastCGI & PHP-FPM\n"
                 . "<FilesMatch \"(?i)\\.(php[0-9]?|phtml|phar|pl|py|cgi|sh|bat|exe|inc|htaccess)$\">\n"
                 . "    <IfModule mod_authz_core.c>\n"
                 . "        Require all denied\n"
                 . "    </IfModule>\n"
                 . "    <IfModule !mod_authz_core.c>\n"
                 . "        Order allow,deny\n"
                 . "        Deny from all\n"
                 . "    </IfModule>\n"
                 . "</FilesMatch>\n";
@file_put_contents($htaccessFile, $htaccessContent);

// 8. Buat Nama Berkas Acak yang Unik & Aman
$uniqueName = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $fileExt;
$destination = $targetDir . '/' . $uniqueName;

// Pindahkan berkas dari temp ke target
if (!move_uploaded_file($uploadedFile['tmp_name'], $destination)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memindahkan berkas yang diunggah ke folder tujuan.'
    ]);
    exit;
}

// 9. Susun URL Lengkap Menuju Berkas
// Deteksi protokol HTTP / HTTPS
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? 'https://' : 'http://';
$host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-zA-Z0-9\.\-:]/', '', $_SERVER['HTTP_HOST']) : 'localhost';
if (empty($host)) {
    $host = 'localhost';
}

// Relative path dari web root
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
$scriptDir = ($scriptDir === '/' || $scriptDir === '\\') ? '' : str_replace('\\', '/', $scriptDir);
$fileUrl = $protocol . $host . $scriptDir . '/uploads/' . $subDir . '/' . $uniqueName;

$isImage = in_array($fileExt, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);

// 10. Kembalikan Respons JSON Standar D-Lite Editor & Standar TinyMCE/CKEditor
echo json_encode([
    'success' => true,
    'location' => $fileUrl, // Kompatibilitas TinyMCE
    'url' => $fileUrl,      // Kompatibilitas umum standar web
    'data' => [
        'url'  => $fileUrl,
        'name' => htmlspecialchars($originalName, ENT_QUOTES, 'UTF-8'),
        'size' => (int)$uploadedFile['size'],
        'type' => $isImage ? 'image' : 'file'
    ],
    'message' => 'Berkas berhasil diunggah.'
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
exit;
