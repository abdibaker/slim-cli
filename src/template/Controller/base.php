<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\{{pluralName}}Service;
use App\CustomResponse as Response;
use Pimple\Psr11\Container;
use Psr\Http\Message\ServerRequestInterface as Request;
use Exception;

final class {{pluralName}}Controller
{
  private {{pluralName}}Service ${{pluralNameLowFirst}}Service;

  public function __construct(private Container $container)
  {
    $this->{{pluralNameLowFirst}}Service = $this->container->get('{{pluralNameLowFirst}}Service');
  }

  public function getAll(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{pluralNameLowFirst}}Service->getAll();
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 500);
    }
  }

  public function getOne(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{pluralNameLowFirst}}Service->getOne((int) $args['{{primaryKeyColumnName}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 404);
    }
  }

  public function create(Request $request, Response $response, array $args): Response
  {
    try {
      $input = (object) $request->getParsedBody();
      $result = $this->{{pluralNameLowFirst}}Service->create(json_decode((string) json_encode($input), true));
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

  public function update(Request $request, Response $response, array $args): Response
  {
    try {
      $input = (object) $request->getParsedBody();
      $result = $this->{{pluralNameLowFirst}}Service->update((int) $args['{{primaryKeyColumnName}}'], json_decode((string) json_encode($input), true));
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

  public function delete(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{pluralNameLowFirst}}Service->delete((int) $args['{{primaryKeyColumnName}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return $response->withJson(['error' => $e->getMessage()], 400);
    }
  }

}