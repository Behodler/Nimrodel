pragma solidity ^0.6.2;

abstract contract PyroTokenRegistryLike{
	function baseTokenMapping (address) public virtual returns (address) ;
}