<?php

declare(strict_types=1);

namespace App\Controller;

use App\CustomResponse as Response;
use App\Helper;
use App\Service\{{className}}Service;
use Exception;
use Pimple\Psr11\Container;
use Psr\Http\Message\ServerRequestInterface as Request;

final class {{className}}Controller
{
  private {{className}}Service ${{classNameLowFirst}}Service;

  public function __construct(private readonly Container $container)
  {
    $this->{{classNameLowFirst}}Service = $this->container->get('{{classNameLowFirst}}Service');
  }

  public function getAll(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getAll();
      return $response->withJson($result);
    } catch (Exception $e) {
      return Helper::handleError($e, $response);
    }
  }

  public function getOne(Request $request, Response $response, array $args): Response
  {
    try {
      $result = $this->{{classNameLowFirst}}Service->getOne(({{primaryKeyType}}) $args['{{primaryKey}}']);
      return $response->withJson($result);
    } catch (Exception $e) {
      return Helper::handleError($e, $response);
    }
  }

  public function create(Request $request, Response $response, array $args): Response
  {
    try {
      $input = $request->getParsedBody();

      $dto = Helper::filterDtoFields($input, {{phpDto}});

      $this->{{classNameLowFirst}}Service->create($dto);
      return $response->withStatus(201);
    } catch (Exception $e) {
      return Helper::handleError($e, $response);
    }
  }

  public function update(Request $request, Response $response, array $args): Response
  {
    try {
      $input = $request->getParsedBody();

      $dto = Helper::filterDtoFields($input, {{phpUpdateDto}});

      $this->{{classNameLowFirst}}Service->update(({{primaryKeyType}}) $args['{{primaryKey}}'], $dto);
      return $response->withStatus(204);
    } catch (Exception $e) {
      return Helper::handleError($e, $response);
    }
  }

  public function delete(Request $request, Response $response, array $args): Response
  {
   try {
     $result = $this->{{classNameLowFirst}}Service->delete(({{primaryKeyType}}) $args['{{primaryKey}}']);
     return $response->withJson($result);
   } catch (Exception $e) {
     return Helper::handleError($e, $response);
   }
  }

}