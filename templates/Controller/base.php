<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\{{className}}Service;
use App\CustomResponse as Response;
use Pimple\Psr11\Container;
use Psr\Http\Message\ServerRequestInterface as Request;
use Exception;

final class {{className}}Controller
{
  private {{className}}Service ${{classNameLowFirst}}Service;

  public function __construct(private Container $container)
  {
    $this->{{classNameLowFirst}}Service = $this->container->get('{{classNameLowFirst}}Service');
  }

  public function getAll(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getAll();
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 500);
    }
  }

  public function getOne(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getOne(({{primaryKeyType}}) $args['{{primaryKey}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 404);
    }
  }

  public function create(Request $request, Response $response, array $args): Response
  {
    try {
      $input = (object) $request->getParsedBody();
      $result = $this->{{classNameLowFirst}}Service->create(json_decode((string) json_encode($input), true));
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

  public function update(Request $request, Response $response, array $args): Response
  {
    try {
      $input = (object) $request->getParsedBody();
      $result = $this->{{classNameLowFirst}}Service->update(({{primaryKeyType}}) $args['{{primaryKey}}'], json_decode((string) json_encode($input), true));
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

  public function delete(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->delete(({{primaryKeyType}}) $args['{{primaryKey}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

}