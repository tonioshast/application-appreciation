<?php
/**
 * proxy-mistral.php
 * Relais sécurisé vers l'API Mistral AI
 * Hébergé sur application.appreciation.fr
 */

// 1. En-têtes JSON et CORS
header('Content-Type: application/json; charset=utf-8');

// Autoriser uniquement les requêtes venant de votre domaine
$allowedOrigins = [
    'https://application.appreciation.fr',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Répondre immédiatement aux requêtes preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 2. Accepter uniquement POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée. Seul POST est accepté.']);
    exit;
}

// 3. Récupération de la clé API Mistral et du modèle (.env ou variables d'environnement)
$apiKey = getenv('MISTRAL_API_KEY') ?: getenv('CLE_API_MISTRAL');
$modelName = getenv('MISTRAL_MODEL') ?: 'mistral-small-latest';

// Recherche du fichier .env dans le dossier courant ou le dossier parent
$envPaths = [__DIR__ . '/.env', __DIR__ . '/../.env'];
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        $envLines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($envLines as $line) {
            $line = trim($line);
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                [$key, $value] = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if (!$apiKey && in_array($key, ['MISTRAL_API_KEY', 'CLE_API_MISTRAL', 'clé-api-mistral'], true)) {
                    $apiKey = $value;
                }
                if (in_array($key, ['MISTRAL_MODEL', 'MODELE_MISTRAL', 'modele-mistral'], true)) {
                    $modelName = $value;
                }
            }
        }
        if ($apiKey) break;
    }
}

// Vérifier que la clé est bien configurée
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API Mistral non configurée sur le serveur.']);
    exit;
}

// 4. Lecture et adaptation du corps de la requête (surcharge dynamique du modèle si configuré)
$rawInput = file_get_contents('php://input');

if (empty($rawInput)) {
    http_response_code(400);
    echo json_encode(['error' => 'Corps de la requête vide.']);
    exit;
}

$data = json_decode($rawInput, true);
if (is_array($data)) {
    // Le serveur impose le modèle défini dans la configuration
    $data['model'] = $modelName;
    $inputPayload = json_encode($data);
} else {
    $inputPayload = $rawInput;
}

// 5. Relais cURL vers Mistral AI
$ch = curl_init('https://api.mistral.ai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $inputPayload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $apiKey
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// 6. Gestion des erreurs cURL
if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Erreur de connexion vers Mistral : ' . $curlError]);
    exit;
}

// 7. Renvoi direct de la réponse Mistral au front-end
http_response_code($httpCode);
echo $response;
