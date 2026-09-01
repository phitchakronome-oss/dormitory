import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto, CreateContractDto, UpdateContractDto } from './dto/tenant.dto';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }

  @Get()
  getAllTenants() {
    return this.tenantService.getAllTenants();
  }

  @Get('contracts/all')
  getAllContracts(@Query('status') status?: any) {
    return this.tenantService.getAllContracts(status);
  }

  @Post('contracts')
  createContract(@Body() dto: CreateContractDto) {
    return this.tenantService.createContract(dto);
  }

  @Put('contracts/:id')
  updateContract(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.tenantService.updateContract(id, dto);
  }

  @Get(':id')
  getTenantById(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Put(':id')
  updateTenant(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantService.updateTenant(id, dto);
  }

  @Delete(':id')
  deleteTenant(@Param('id') id: string) {
    return this.tenantService.deleteTenant(id);
  }
}
