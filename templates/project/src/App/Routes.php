<?php

declare(strict_types=1);
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

return static function ($app) {

  $authMiddleware = function (Request $request, RequestHandler $handler): Response {
    $jwtHeader = $request->getHeaderLine('Authorization');
    if (!$jwtHeader) {
      throw new Exception('JWT Token required.', 400);
    }

    $jwt = explode('Bearer ', $jwtHeader);
    if (count($jwt) !== 2) {
      throw new Exception('JWT Token invalid.', 400);
    }

    try {
      $key = new Key('7w8&^7af9*!o%j#)b$#k*p2w#q9@s1z&3n1!&y^vq36znm7!%h', 'HS256');
      $decoded = JWT::decode($jwt[1], $key);
    } catch (\UnexpectedValueException $e) {
      throw new Exception('Forbidden: you are not authorized.', 403);
    }

    $object = $request->getParsedBody() ?: [];
    $object['decoded'] = $decoded;

    // You can also modify the request with $request = $request->withParsedBody($object);
    $request = $request->withParsedBody($object);

    return $handler->handle($request);
  };

  // --------------- Home Routes ---------------- //
  $homeController = 'App\Controller\Home:';

  $app->get('/', "{$homeController}api");
  $app->get('/swagger', "{$homeController}swagger");
  $app->get('/api', "{$homeController}getHelp");
  $app->get('/status', "{$homeController}getStatus");

  return $app;
};