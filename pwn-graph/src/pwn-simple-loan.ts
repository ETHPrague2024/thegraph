import {
  LOANClaimed as LOANClaimedEvent,
  LOANCreated as LOANCreatedEvent,
  LOANExpirationDateExtended as LOANExpirationDateExtendedEvent,
  LOANPaidBack as LOANPaidBackEvent,
  VaultPull as VaultPullEvent,
  VaultPush as VaultPushEvent,
  VaultPushFrom as VaultPushFromEvent
} from "../generated/PWNSimpleLoan/PWNSimpleLoan"
import {
  LOANClaimed,
  LOANCreated,
  LOANExpirationDateExtended,
  LOANPaidBack,
  VaultPull,
  VaultPush,
  VaultPushFrom
} from "../generated/schema"

export function handleLOANClaimed(event: LOANClaimedEvent): void {
  let entity = new LOANClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.loanId = event.params.loanId
  entity.defaulted = event.params.defaulted

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLOANCreated(event: LOANCreatedEvent): void {
  let entity = new LOANCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.loanId = event.params.loanId
  entity.terms_lender = event.params.terms.lender
  entity.terms_borrower = event.params.terms.borrower
  entity.terms_expiration = event.params.terms.expiration
  entity.terms_collateral_category = event.params.terms.collateral.category
  entity.terms_collateral_assetAddress =
    event.params.terms.collateral.assetAddress
  entity.terms_collateral_id = event.params.terms.collateral.id
  entity.terms_collateral_amount = event.params.terms.collateral.amount
  entity.terms_asset_category = event.params.terms.asset.category
  entity.terms_asset_assetAddress = event.params.terms.asset.assetAddress
  entity.terms_asset_id = event.params.terms.asset.id
  entity.terms_asset_amount = event.params.terms.asset.amount
  entity.terms_loanRepayAmount = event.params.terms.loanRepayAmount
  entity.factoryDataHash = event.params.factoryDataHash
  entity.factoryAddress = event.params.factoryAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLOANExpirationDateExtended(
  event: LOANExpirationDateExtendedEvent
): void {
  let entity = new LOANExpirationDateExtended(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.loanId = event.params.loanId
  entity.extendedExpirationDate = event.params.extendedExpirationDate

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLOANPaidBack(event: LOANPaidBackEvent): void {
  let entity = new LOANPaidBack(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.loanId = event.params.loanId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVaultPull(event: VaultPullEvent): void {
  let entity = new VaultPull(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.asset_category = event.params.asset.category
  entity.asset_assetAddress = event.params.asset.assetAddress
  entity.asset_id = event.params.asset.id
  entity.asset_amount = event.params.asset.amount
  entity.origin = event.params.origin

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVaultPush(event: VaultPushEvent): void {
  let entity = new VaultPush(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.asset_category = event.params.asset.category
  entity.asset_assetAddress = event.params.asset.assetAddress
  entity.asset_id = event.params.asset.id
  entity.asset_amount = event.params.asset.amount
  entity.beneficiary = event.params.beneficiary

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleVaultPushFrom(event: VaultPushFromEvent): void {
  let entity = new VaultPushFrom(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.asset_category = event.params.asset.category
  entity.asset_assetAddress = event.params.asset.assetAddress
  entity.asset_id = event.params.asset.id
  entity.asset_amount = event.params.asset.amount
  entity.origin = event.params.origin
  entity.beneficiary = event.params.beneficiary

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
