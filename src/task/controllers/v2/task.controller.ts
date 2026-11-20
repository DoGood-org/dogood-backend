import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { CreateTaskRequestDtoV2 } from 'src/task/dtos/requests/v2/create-task-request.dto';
import { GetTaskParticipantsRequestDtoV2 } from 'src/task/dtos/requests/v2/get-task-participants-request.dto';
import { GetTasksRequestDtoV2 } from 'src/task/dtos/requests/v2/get-tasks-request.dto';
import { UpdateTaskRequestDtoV2 } from 'src/task/dtos/requests/v2/update-task-request.dto';
import { UpdateTaskStatusRequestDtoV2 } from 'src/task/dtos/requests/v2/update-task-status-request.dto';
import { TaskModifyV2Guard } from 'src/task/guards/task-modify-v2.guard';
import { TaskStatusV2Guard } from 'src/task/guards/task-status-v2.guard';
import { TaskParticipantV2, TaskV2 } from 'src/task/interfaces/task';
import { TaskServiceV2 } from 'src/task/services/v2/task.service';
import { GetTaskParticipantsResponseDtoV2 } from 'src/task/dtos/responses/v2/get-task-participants-response.dto';
import { GetTasksResponseDtoV2 } from 'src/task/dtos/responses/v2/get-tasks-response.dto';
import { TaskResponseDtoV2 } from 'src/task/dtos/responses/v2/task-response.dto';

@Controller({ path: 'tasks', version: '2' })
export class TaskControllerV2 {
  constructor(private readonly taskService: TaskServiceV2) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetTasksResponseDtoV2 })
  async getTasks(
    @Query() query: GetTasksRequestDtoV2,
  ): Promise<ResponseWrapper<TaskV2[]>> {
    return new ResponseWrapper(await this.taskService.getTasks(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: TaskResponseDtoV2 })
  async createTask(
    @User('id') userId: string,
    @Body() body: CreateTaskRequestDtoV2,
  ): Promise<ResponseWrapper<TaskV2>> {
    return new ResponseWrapper(await this.taskService.createTask(body, userId));
  }

  @Get(':id/participants')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetTaskParticipantsResponseDtoV2 })
  async getTaskParticipants(
    @Param('id') id: string,
    @Query() query: GetTaskParticipantsRequestDtoV2,
  ): Promise<ResponseWrapper<TaskParticipantV2[]>> {
    return new ResponseWrapper(
      await this.taskService.getTaskParticipants(id, query),
    );
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV2 })
  async getTaskById(@Param('id') id: string): Promise<ResponseWrapper<TaskV2>> {
    return new ResponseWrapper(await this.taskService.getTaskById(id));
  }

  @Patch(':id')
  @UseGuards(TaskModifyV2Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV2 })
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskRequestDtoV2,
  ): Promise<ResponseWrapper<TaskV2>> {
    return new ResponseWrapper(await this.taskService.updateTask(id, body));
  }

  @Patch(':id/status')
  @UseGuards(TaskStatusV2Guard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TaskResponseDtoV2 })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusRequestDtoV2,
  ): Promise<ResponseWrapper<TaskV2>> {
    return new ResponseWrapper(
      await this.taskService.updateTaskStatus(id, body.status),
    );
  }

  @Delete(':id')
  @UseGuards(TaskModifyV2Guard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deleteTask(@Param('id') id: string): Promise<void> {
    await this.taskService.deleteTask(id);
  }
}
