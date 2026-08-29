<?php
/**
 * proxy-ecoledirecte.php
 * Relais sécurisé pour l'interrogation de l'API officielle ÉcoleDirecte (APIp)
 * Contournement des restrictions CORS du navigateur pour les notes et appréciations.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Token, Authorization, X-Requested-With');

// Gestion du pré-vol CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Récupération des données envoyées en POST
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input && !empty($_POST)) {
    $input = $_POST;
}

$endpoint    = $input['endpoint'] ?? 'notes'; // 'notes' ou 'appreciations'
$idClasse    = $input['id_classe'] ?? '';
$periodeCode = $input['periode_code'] ?? 'ALL'; // ex: 'A001', 'A002' ou 'ALL'
$idMatiere   = $input['id_matiere'] ?? '';
$edToken     = $input['edToken'] ?? $input['ed_token'] ?? $input['token'] ?? '';
$idCompte    = $input['id_compte'] ?? $input['ed_user_id'] ?? '';
$typeStructure = $input['type_structure'] ?? 'C'; // 'C' pour Classe, 'G' pour Groupe

// Validation stricte des paramètres requis
$missingParams = [];
if (empty($idClasse)) $missingParams[] = 'id_classe';
if (empty($idMatiere)) $missingParams[] = 'id_matiere';
if (empty($edToken)) $missingParams[] = 'edToken';
if (empty($idCompte)) $missingParams[] = 'id_compte';

if (!empty($missingParams)) {
    http_response_code(400);
    echo json_encode([
        'code'    => 400,
        'success' => false,
        'error'   => 'Paramètres manquants : ' . implode(', ', $missingParams),
        'missing' => $missingParams,
        'received' => [
            'endpoint'     => $endpoint,
            'id_classe'    => $idClasse,
            'periode_code' => $periodeCode,
            'id_matiere'   => $idMatiere,
            'has_token'    => !empty($edToken),
            'id_compte'    => $idCompte
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Construction de l'URL cible ÉcoleDirecte
$ressourceFile = ($endpoint === 'appreciations') ? 'appreciations.awp' : 'notes.awp';
$versionApi    = "4.101.1";
$url = "https://apip.ecoledirecte.com/v3/enseignants/{$idCompte}/{$typeStructure}/{$idClasse}/periodes/{$periodeCode}/matieres/{$idMatiere}/{$ressourceFile}?verbe=get&v={$versionApi}";

// Configuration cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, 'data={}');
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    'Accept: application/json, text/plain, */*',
    'Accept-Language: fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Content-Type: application/x-www-form-urlencoded',
    'X-Token: ' . $edToken,
    'Origin: https://www.ecoledirecte.com',
    'Referer: https://www.ecoledirecte.com/'
]);

$startTime = microtime(true);
$response = curl_exec($ch);
$durationMs = round((microtime(true) - $startTime) * 1000);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode([
        'code'      => 500,
        'success'   => false,
        'error'     => 'Erreur de connexion cURL : ' . $curlError,
        'url'       => $url,
        'duration'  => $durationMs . 'ms'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Journalisation de debug (ed_debug.log)
try {
    $logFile = __DIR__ . '/ed_debug.log';
    $logData = sprintf(
        "[%s] | %dms | HTTP %d | Endpoint: %s | Compte: %s | Classe: %s | Matière: %s\nURL: %s\nRéponse: %s\n%s\n",
        date('Y-m-d H:i:s'),
        $durationMs,
        $httpCode,
        $endpoint,
        $idCompte,
        $idClasse,
        $idMatiere,
        $url,
        substr($response, 0, 500) . (strlen($response) > 500 ? '... [tronqué]' : ''),
        str_repeat('-', 60)
    );
    @file_put_contents($logFile, $logData, FILE_APPEND);
} catch (\Throwable $t) {
    // Échec silencieux si droits d'écriture restreints
}

// Envoi de la réponse au client
http_response_code($httpCode > 0 ? $httpCode : 200);
echo $response;
