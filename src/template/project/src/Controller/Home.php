<?php

declare(strict_types=1);

namespace App\Controller;

use App\CustomResponse as Response;
use Pimple\Psr11\Container;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Home
{
    private const API_NAME = 'slim4-api-skeleton';

    private const API_VERSION = '0.41.0';

    public function __construct(private Container $container)
    {
    }

    public function getHelp(Request $request, Response $response): Response
    {
        $message = [
            'api'       => self::API_NAME,
            'version'   => self::API_VERSION,
            'timestamp' => time(),
        ];

        return $response->withJson($message);
    }
    public function api(Request $request, Response $response): Response
    {
        $file = 'public/swagger/index.html';
        if (is_file($file)) {
            $body = file_get_contents($file);
            $response->withHeader('Content-Type', 'text/html')->getBody()->write($body);
            return $response;
        }
        return $response->withStatus(404);
    }
    public function swagger(Request $request, Response $response): Response
    {
        $file = 'public/swagger/swagger.json';
        if (is_file($file)) {
            $body = file_get_contents($file);
            $response->withHeader('Content-Type', 'application/json')->getBody()->write($body);
            return $response;
        }
        return $response->withStatus(404);
    }

    public function getStatus(Request $request, Response $response): Response
    {
        $this->container->get('db');
        $status = [
            'status'    => [
                'database' => 'OK',
            ],
            'api'       => self::API_NAME,
            'version'   => self::API_VERSION,
            'timestamp' => time(),
        ];

        return $response->withJson($status);
    }
}